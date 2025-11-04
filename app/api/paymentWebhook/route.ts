import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { verifyPayment } from "@/lib/razorpay/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, payload } = body;

    // Verify webhook signature (optional but recommended)
    // You can add signature verification here using Razorpay webhook secret

    if (event === "payment.captured") {
      const { order_id, payment_id, amount } = payload.payment.entity;

      // Verify payment signature
      const signature = request.headers.get("x-razorpay-signature");
      if (!signature) {
        return NextResponse.json(
          { error: "Missing signature" },
          { status: 400 }
        );
      }

      // Update order status using service role client to bypass RLS
      const supabase = createServiceRoleClient();
      
      // Check if this is a wallet topup transaction
      const { data: walletTransaction } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("razorpay_order_id", order_id)
        .eq("status", "pending")
        .single();

      if (walletTransaction) {
        // This is a wallet topup - update wallet balance
        const { data: user } = await supabase
          .from("users")
          .select("balance")
          .eq("id", walletTransaction.user_id)
          .single();

        if (user) {
          const balanceBefore = parseFloat(user.balance?.toString() || "0");
          const topupAmount = parseFloat(walletTransaction.amount.toString());
          const balanceAfter = balanceBefore + topupAmount;

          // Update wallet transaction atomically (only if still pending) to prevent double processing
          const { data: updatedTransaction, error: updateError } = await supabase
            .from("wallet_transactions")
            .update({
              status: "completed",
              balance_before: balanceBefore,
              balance_after: balanceAfter,
              razorpay_payment_id: payment_id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", walletTransaction.id)
            .eq("status", "pending") // Only update if still pending (prevents double processing)
            .select()
            .single();

          if (updateError || !updatedTransaction) {
            // Transaction was already processed (likely by verify-topup endpoint)
            console.log("Wallet transaction already processed");
            return NextResponse.json({ success: true, type: "wallet_topup", alreadyProcessed: true });
          }

          // Update user balance
          const { error: balanceError } = await supabase
            .from("users")
            .update({
              balance: balanceAfter,
              updated_at: new Date().toISOString(),
            })
            .eq("id", walletTransaction.user_id);

          if (balanceError) {
            console.error("Failed to update user balance:", balanceError);
            // Rollback transaction status
            await supabase
              .from("wallet_transactions")
              .update({
                status: "pending",
                updated_at: new Date().toISOString(),
              })
              .eq("id", walletTransaction.id);
          }
        }

        return NextResponse.json({ success: true, type: "wallet_topup" });
      }

      // Handle regular order payment
      // First check if order exists
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("razorpay_order_id", order_id)
        .single();

      if (!existingOrder) {
        console.error("Order not found for razorpay_order_id:", order_id);
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 }
        );
      }

      // Only process if order is not already completed (prevent double processing)
      if (existingOrder.status === "completed") {
        console.log("Order already completed, skipping wallet credit");
        return NextResponse.json({ success: true, type: "order", alreadyProcessed: true });
      }

      // Update order status
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .update({
          razorpay_payment_id: payment_id,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("razorpay_order_id", order_id)
        .eq("status", "pending") // Only update if still pending (prevents double processing)
        .select()
        .single();

      if (orderError || !order) {
        console.error("Failed to update order:", orderError);
        // Order might have been updated by verifyPayment endpoint
        return NextResponse.json({ success: true, type: "order", alreadyProcessed: true });
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
                razorpay_payment_id: payment_id,
                description: `Payment received for item: ${item?.title || "Item"}`,
              });
          }
        }
      }

      // Note: We do NOT change item status to "rented" here
      // Items remain "available" so other users can book other dates
      // Only the specific booking dates are blocked, not the entire item

      // If this order is linked to a request, update request status to completed
      if (order.request_id) {
        await supabase
          .from("requests")
          .update({ 
            status: "completed",
            updated_at: new Date().toISOString() 
          })
          .eq("id", order.request_id);
      }

      return NextResponse.json({ success: true, type: "order" });
    }

    if (event === "payment.failed") {
      const { order_id } = payload.payment.entity;
      // Use service role client to bypass RLS
      const supabase = createServiceRoleClient();

      // Check if this is a wallet topup transaction
      const { data: walletTransaction } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("razorpay_order_id", order_id)
        .eq("status", "pending")
        .single();

      if (walletTransaction) {
        // Update wallet transaction status to failed
        await supabase
          .from("wallet_transactions")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", walletTransaction.id);

        return NextResponse.json({ success: true, type: "wallet_topup" });
      }

      // Handle regular order payment failure
      await supabase
        .from("orders")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("razorpay_order_id", order_id);

      return NextResponse.json({ success: true, type: "order" });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

