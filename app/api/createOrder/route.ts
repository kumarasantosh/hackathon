import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";
import { createRazorpayOrder } from "@/lib/razorpay/client";

export async function POST(request: NextRequest) {
  try {
    // Await headers() first to ensure it's available for Clerk's auth()
    await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const body = await request.json();
    const { itemId, requestId } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Get or create user from database first
    const { user, error: userError } = await getOrCreateUser(userId);

    if (userError || !user) {
      return NextResponse.json(
        { error: userError || "User not found" },
        { status: 404 }
      );
    }

    // Use service role client to bypass RLS when creating orders
    // RLS policies can't verify Clerk authentication directly
    let serviceClient;
    try {
      serviceClient = createServiceRoleClient();
    } catch (error: any) {
      console.error("Failed to create service role client:", error.message);
      return NextResponse.json(
        { 
          error: "Server configuration error",
          details: process.env.NODE_ENV === "development" ? error.message : undefined
        },
        { status: 500 }
      );
    }

    // If requestId is provided, check if order already exists
    // Note: This check may fail if request_id column doesn't exist, so we handle it gracefully
    let existingOrder = null;
    if (requestId) {
      try {
        const { data: order, error: checkError } = await serviceClient
          .from("orders")
          .select("*")
          .eq("request_id", requestId)
          .eq("user_id", user.id)
          .in("status", ["pending", "completed"])
          .maybeSingle();
        
        if (!checkError) {
          existingOrder = order;
        } else if (checkError.message?.includes("request_id")) {
          // Column doesn't exist, ignore and proceed
          console.warn("request_id column not found, skipping existing order check");
        } else {
          console.warn("Error checking for existing order:", checkError);
        }
      } catch (error: any) {
        // If request_id column doesn't exist, ignore the error and proceed
        if (error.message?.includes("request_id")) {
          console.warn("Could not check for existing order by request_id - column not found");
        } else {
          console.warn("Could not check for existing order by request_id:", error);
        }
        existingOrder = null;
      }
    }

    if (existingOrder) {
      // If order exists and is pending, return existing order data for Razorpay
      if (existingOrder.status === "pending") {
        // Get item to calculate security deposit
        const { data: existingItemData, error: itemError } = await serviceClient
          .from("items")
          .select("*")
          .eq("id", existingOrder.item_id)
          .single();

        if (itemError || !existingItemData || existingItemData.type !== "paid") {
          console.error("Item fetch error:", itemError);
          return NextResponse.json(
            { error: "Item not found or not available for purchase" },
            { status: 404 }
          );
        }

        // Calculate total amount with 10% security deposit for existing order
        const baseAmount = parseFloat(existingItemData.amount!.toString());
        const securityDeposit = baseAmount * 0.1;
        const totalAmount = baseAmount + securityDeposit;
        
        // Check if Razorpay order already exists
        if (existingOrder.razorpay_order_id) {
          return NextResponse.json({
            orderId: existingOrder.id,
            razorpayOrderId: existingOrder.razorpay_order_id,
            amount: Math.round(totalAmount * 100),
            currency: "INR",
            keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          });
        }
        
        // Create Razorpay order for existing order
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
          console.error("Razorpay credentials missing");
          return NextResponse.json(
            { error: "Payment gateway configuration error" },
            { status: 500 }
          );
        }

        let razorpayOrder;
        try {
          // Create a short receipt ID (Razorpay requires max 40 characters)
          const shortId = existingOrder.id.substring(0, 8);
          const timestamp = Date.now().toString().slice(-6);
          const receipt = `order_${shortId}_${timestamp}`;

          razorpayOrder = await createRazorpayOrder({
            amount: Math.round(totalAmount * 100), // Include security deposit
            receipt: receipt,
            notes: {
              order_id: existingOrder.id,
              item_id: existingOrder.item_id,
              user_id: user.id,
              request_id: requestId,
            },
          });
        } catch (razorpayError: any) {
          console.error("Razorpay order creation failed:", razorpayError);
          return NextResponse.json(
            { 
              error: "Failed to create payment order",
              details: process.env.NODE_ENV === "development" ? razorpayError?.message : undefined
            },
            { status: 500 }
          );
        }

        // Update order with Razorpay order ID
        const { error: updateError } = await serviceClient
          .from("orders")
          .update({ razorpay_order_id: razorpayOrder.id })
          .eq("id", existingOrder.id);

        if (updateError) {
          console.error("Failed to update order with Razorpay ID:", updateError);
        }

        return NextResponse.json({
          orderId: existingOrder.id,
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        });
      }
      // If order is already completed, return error
      return NextResponse.json(
        { error: "Order already completed" },
        { status: 400 }
      );
    }

    // Get item details
    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("*")
      .eq("id", itemId)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    // For requests, item might not be "available" anymore, so allow if status is available or rented
    if (!requestId && item.status !== "available") {
      return NextResponse.json(
        { error: "Item is not available for purchase" },
        { status: 400 }
      );
    }

    if (item.type !== "paid") {
      return NextResponse.json(
        { error: "Item is not a paid item" },
        { status: 400 }
      );
    }

    // Calculate total amount with 10% security deposit
    const baseAmount = parseFloat(item.amount!.toString());
    const securityDeposit = baseAmount * 0.1;
    const totalAmount = baseAmount + securityDeposit;

    // Create order in database
    // Try with request_id first, fallback if column doesn't exist
    let order;
    let orderError;
    
    if (requestId) {
      // Try with request_id first
      const orderData: any = {
        user_id: user.id,
        item_id: itemId,
        amount: totalAmount, // Include security deposit
        status: "pending",
        request_id: requestId,
      };
      
      const result = await serviceClient
        .from("orders")
        .insert(orderData)
        .select()
        .single();
      
      order = result.data;
      orderError = result.error;
      
      // If error is about missing request_id column, retry without it
      if (orderError && orderError.message?.includes("request_id")) {
        console.warn("request_id column not found, creating order without it");
        const retryResult = await serviceClient
          .from("orders")
          .insert({
            user_id: user.id,
            item_id: itemId,
            amount: totalAmount, // Include security deposit
            status: "pending",
          })
          .select()
          .single();
        
        order = retryResult.data;
        orderError = retryResult.error;
      }
    } else {
      // No requestId, create order normally
      const result = await serviceClient
        .from("orders")
        .insert({
          user_id: user.id,
          item_id: itemId,
          amount: totalAmount, // Include security deposit
          status: "pending",
        })
        .select()
        .single();
      
      order = result.data;
      orderError = result.error;
    }

    if (orderError || !order) {
      console.error("Order creation database error:", orderError);
      return NextResponse.json(
        { 
          error: "Failed to create order",
          details: process.env.NODE_ENV === "development" ? (orderError?.message || "Unknown error") : undefined
        },
        { status: 500 }
      );
    }

    // Create Razorpay order
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Razorpay credentials missing");
      return NextResponse.json(
        { error: "Payment gateway configuration error" },
        { status: 500 }
      );
    }

    let razorpayOrder;
    try {
      // Create a short receipt ID (Razorpay requires max 40 characters)
      const shortId = order.id.substring(0, 8);
      const timestamp = Date.now().toString().slice(-6);
      const receipt = `order_${shortId}_${timestamp}`;

      razorpayOrder = await createRazorpayOrder({
        amount: Math.round(totalAmount * 100), // Convert to paise, includes security deposit
        receipt: receipt,
        notes: {
          order_id: order.id,
          item_id: itemId,
          user_id: user.id,
        },
      });
    } catch (razorpayError: any) {
      console.error("Razorpay order creation failed:", razorpayError);
      return NextResponse.json(
        { 
          error: "Failed to create payment order",
          details: process.env.NODE_ENV === "development" ? razorpayError?.message : undefined
        },
        { status: 500 }
      );
    }

    // Update order with Razorpay order ID using service client
    await serviceClient
      .from("orders")
      .update({ razorpay_order_id: razorpayOrder.id })
      .eq("id", order.id);

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

