import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { verifyPayment } from "@/lib/razorpay/client";

export async function POST(request: NextRequest) {
  try {
    await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, requestId } = body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Missing required payment parameters" },
        { status: 400 }
      );
    }

    // Verify payment signature
    const isValid = await verifyPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Update order status using service role client to bypass RLS
    const supabase = createServiceRoleClient();
    
    // First check if order exists
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("razorpay_order_id", razorpayOrderId)
      .single();

    if (!existingOrder) {
      console.error("Order not found");
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Only process if order is not already completed (prevent double processing)
    if (existingOrder.status === "completed") {
      // Order already processed, return success with current order data
      return NextResponse.json({ success: true, order: existingOrder, alreadyProcessed: true });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .update({
        razorpay_payment_id: razorpayPaymentId,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("razorpay_order_id", razorpayOrderId)
      .eq("status", "pending") // Only update if still pending (prevents double processing)
      .select()
      .single();

    if (orderError || !order) {
      console.error("Failed to update order:", orderError);
      // Order might have been updated by webhook, return success
      return NextResponse.json({ success: true, order: existingOrder, alreadyProcessed: true });
    }

    // Get item details to find the owner
    const { data: item } = await supabase
      .from("items")
      .select("user_id, title")
      .eq("id", order.item_id)
      .single();

    // Credit the item owner's wallet
    if (item && item.user_id && order.amount) {
      const ownerId = item.user_id;
      const orderAmount = parseFloat(order.amount.toString());

      // Get owner's current balance
      const { data: owner } = await supabase
        .from("users")
        .select("balance")
        .eq("id", ownerId)
        .single();

      if (owner) {
        const balanceBefore = parseFloat(owner.balance?.toString() || "0");
        const balanceAfter = balanceBefore + orderAmount;

        // Update owner's balance
        const { error: balanceError } = await supabase
          .from("users")
          .update({
            balance: balanceAfter,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ownerId);

        if (balanceError) {
          console.error("Failed to update owner balance:", balanceError);
        } else {
          // Create wallet transaction record for owner
          await supabase
            .from("wallet_transactions")
            .insert({
              user_id: ownerId,
              type: "service_payment",
              amount: orderAmount,
              balance_before: balanceBefore,
              balance_after: balanceAfter,
              status: "completed",
                service_order_id: order.id,
                razorpay_payment_id: razorpayPaymentId,
                description: `Payment received for item: ${item?.title || "Item"}`,
              });
        }
      }
    }

    // Note: We do NOT change item status to "rented" here
    // Items remain "available" so other users can book other dates
    // Only the specific booking dates are blocked, not the entire item

    // If this order is linked to a request, update request status to completed
    if (requestId || order.request_id) {
      const reqId = requestId || order.request_id;
      await supabase
        .from("requests")
        .update({ 
          status: "completed",
          updated_at: new Date().toISOString() 
        })
        .eq("id", reqId);
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Verify payment error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
