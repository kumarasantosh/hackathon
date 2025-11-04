import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";

export async function POST(request: NextRequest) {
  try {
    await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = await getOrCreateUser(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Get order details
    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select(`
        *,
        service_requests(type, amount, service_name, user_id),
        service_offers(provider_id)
      `)
      .eq("id", orderId)
      .eq("status", "pending")
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found or already processed" },
        { status: 404 }
      );
    }

    // Verify this order belongs to the requester
    if (order.service_requests?.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const orderAmount = parseFloat(order.amount.toString());
    const requesterBalance = parseFloat(user.balance?.toString() || "0");

    if (requesterBalance < orderAmount) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
          required: orderAmount,
          current: requesterBalance,
        },
        { status: 402 }
      );
    }

    // Transfer funds
    const providerId = order.service_offers?.provider_id;
    if (!providerId) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Deduct from requester
    await serviceClient
      .from("users")
      .update({
        balance: requesterBalance - orderAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // Create transaction for requester
    await serviceClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: "service_payment",
        amount: -orderAmount,
        balance_before: requesterBalance,
        balance_after: requesterBalance - orderAmount,
        status: "completed",
        service_order_id: order.id,
        description: `Payment for service: ${order.service_requests?.service_name || "Service"}`,
      });

    // Add to provider
    const { data: provider } = await serviceClient
      .from("users")
      .select("balance")
      .eq("id", providerId)
      .single();

    const providerBalance = parseFloat(provider?.balance?.toString() || "0");

    await serviceClient
      .from("users")
      .update({
        balance: providerBalance + orderAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", providerId);

    // Create transaction for provider
    await serviceClient
      .from("wallet_transactions")
      .insert({
        user_id: providerId,
        type: "service_payment",
        amount: orderAmount,
        balance_before: providerBalance,
        balance_after: providerBalance + orderAmount,
        status: "completed",
        service_order_id: order.id,
        description: `Payment received for service: ${order.service_requests?.service_name || "Service"}`,
      });

    // Update order status
    await serviceClient
      .from("orders")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return NextResponse.json({
      success: true,
      message: "Payment processed successfully",
    });
  } catch (error: any) {
    console.error("Process pending service order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

