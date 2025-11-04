import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";
import { verifyPayment } from "@/lib/razorpay/client";

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
    const { transactionId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!transactionId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
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

    const serviceClient = createServiceRoleClient();

    // Get transaction details - check if it exists (pending or already completed)
    const { data: transaction, error: transactionError } = await serviceClient
      .from("wallet_transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("user_id", user.id)
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // If transaction is already completed (e.g., by webhook), return success
    if (transaction.status === "completed") {
      const { data: currentUser } = await serviceClient
        .from("users")
        .select("balance")
        .eq("id", user.id)
        .single();

      return NextResponse.json({
        success: true,
        newBalance: parseFloat(currentUser?.balance?.toString() || "0"),
        message: "Wallet top-up already processed",
      });
    }

    // If transaction is not pending, return error
    if (transaction.status !== "pending") {
      return NextResponse.json(
        { error: `Transaction ${transaction.status}` },
        { status: 400 }
      );
    }

    // Get current user balance to verify it matches transaction's balance_before
    // This helps detect race conditions
    const { data: currentUser } = await serviceClient
      .from("users")
      .select("balance")
      .eq("id", user.id)
      .single();

    const currentBalance = parseFloat(currentUser?.balance?.toString() || "0");
    const transactionBalanceBefore = parseFloat(transaction.balance_before?.toString() || "0");
    
    // Use the transaction's balance_before to ensure consistency
    // If current balance differs, it means the balance was already updated (e.g., by webhook)
    // In that case, we should recalculate based on current balance
    const balanceBefore = currentBalance >= transactionBalanceBefore 
      ? currentBalance 
      : transactionBalanceBefore;
    const balanceAfter = balanceBefore + parseFloat(transaction.amount.toString());

    // Update transaction status atomically (only if still pending) to prevent double processing
    const { data: updatedTransaction, error: updateError } = await serviceClient
      .from("wallet_transactions")
      .update({
        status: "completed",
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        razorpay_payment_id: razorpayPaymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id)
      .eq("status", "pending") // Only update if still pending (prevents double processing)
      .select()
      .single();

    if (updateError || !updatedTransaction) {
      // Transaction was already processed (likely by webhook)
      const { data: currentUserAfter } = await serviceClient
        .from("users")
        .select("balance")
        .eq("id", user.id)
        .single();

      return NextResponse.json({
        success: true,
        newBalance: parseFloat(currentUserAfter?.balance?.toString() || "0"),
        message: "Wallet top-up already processed",
      });
    }

    // Update user balance
    const { error: balanceError } = await serviceClient
      .from("users")
      .update({
        balance: balanceAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (balanceError) {
      console.error("Failed to update user balance:", balanceError);
      // Rollback transaction status
      await serviceClient
        .from("wallet_transactions")
        .update({
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);
      
      return NextResponse.json(
        { error: "Failed to update wallet balance" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newBalance: balanceAfter,
      message: "Wallet top-up successful",
    });
  } catch (error: any) {
    console.error("Verify top-up error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

