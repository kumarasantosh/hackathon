import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";
import { createRazorpayOrder } from "@/lib/razorpay/client";

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
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Amount must be greater than 0" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Create wallet transaction record
    const { data: transaction, error: transactionError } = await serviceClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: "topup",
        amount: amount,
        balance_before: parseFloat(user.balance?.toString() || "0"),
        balance_after: parseFloat(user.balance?.toString() || "0"), // Will be updated after payment
        status: "pending",
        description: `Wallet top-up of ₹${amount}`,
      })
      .select()
      .single();

    if (transactionError || !transaction) {
      console.error("Failed to create wallet transaction:", transactionError);
      return NextResponse.json(
        { error: "Failed to create top-up request" },
        { status: 500 }
      );
    }

    // Create Razorpay order
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Payment gateway configuration error" },
        { status: 500 }
      );
    }

    let razorpayOrder;
    try {
      const amountInPaise = Math.round(amount * 100);
      
      // Validate amount before creating order
      if (amountInPaise < 100) {
        return NextResponse.json(
          {
            error: "Amount must be at least ₹1",
            details: `Minimum amount is ₹1. You tried to top up ₹${amount.toFixed(2)}`
          },
          { status: 400 }
        );
      }

      // Create a short receipt ID (Razorpay requires max 40 characters)
      // Format: topup_<first-8-chars-of-uuid>_<timestamp-last-6>
      const shortId = transaction.id.substring(0, 8);
      const timestamp = Date.now().toString().slice(-6);
      const receipt = `topup_${shortId}_${timestamp}`;

      razorpayOrder = await createRazorpayOrder({
        amount: amountInPaise,
        receipt: receipt,
        notes: {
          transaction_id: transaction.id,
          user_id: user.id,
          type: "wallet_topup",
        },
      });
    } catch (razorpayError: any) {
      console.error("Razorpay order creation failed:", razorpayError);
      console.error("Error details:", {
        message: razorpayError?.message,
        stack: razorpayError?.stack,
        error: razorpayError?.error,
      });
      
      // Clean up the transaction if Razorpay order creation fails
      try {
        await serviceClient
          .from("wallet_transactions")
          .delete()
          .eq("id", transaction.id);
      } catch (cleanupError) {
        console.error("Failed to cleanup transaction:", cleanupError);
      }
      
      return NextResponse.json(
        {
          error: razorpayError?.message || "Failed to create payment order",
          details: process.env.NODE_ENV === "development" ? {
            message: razorpayError?.message,
            error: razorpayError?.error,
            stack: razorpayError?.stack,
          } : undefined
        },
        { status: 500 }
      );
    }

    // Update transaction with Razorpay order ID
    await serviceClient
      .from("wallet_transactions")
      .update({ razorpay_order_id: razorpayOrder.id })
      .eq("id", transaction.id);

    return NextResponse.json({
      transactionId: transaction.id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("Wallet top-up error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

