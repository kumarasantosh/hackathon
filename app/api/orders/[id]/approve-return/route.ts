import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const serviceClient = createServiceRoleClient();

    // Get the order with item details
    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select(`
        *,
        items(
          id,
          title,
          amount,
          user_id,
          users(id, name)
        ),
        users!orders_user_id_fkey(id, name, balance)
      `)
      .eq("id", id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Verify the user is the owner of the item
    if (order.items.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only approve returns for your own items" },
        { status: 403 }
      );
    }

    // Check if return is pending
    if (order.return_status !== "pending") {
      return NextResponse.json(
        { error: "No pending return request for this order" },
        { status: 400 }
      );
    }

    // Calculate security deposit (10% of base amount)
    const baseAmount = parseFloat(order.items.amount?.toString() || "0");
    const securityDeposit = baseAmount * 0.1;

    // Get owner's current balance
    const { data: owner } = await serviceClient
      .from("users")
      .select("balance")
      .eq("id", user.id)
      .single();

    const ownerBalance = parseFloat(owner?.balance?.toString() || "0");

    // Check if owner has sufficient balance
    if (ownerBalance < securityDeposit) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
          message: `You need ₹${securityDeposit.toFixed(2)} to refund the security deposit. Your current balance is ₹${ownerBalance.toFixed(2)}`,
          requiredAmount: securityDeposit,
          currentBalance: ownerBalance,
        },
        { status: 402 }
      );
    }

    // Get borrower's current balance
    const borrowerId = order.user_id;
    const { data: borrower } = await serviceClient
      .from("users")
      .select("balance")
      .eq("id", borrowerId)
      .single();

    const borrowerBalance = parseFloat(borrower?.balance?.toString() || "0");

    // Transfer security deposit from owner to borrower
    const ownerBalanceAfter = ownerBalance - securityDeposit;
    const borrowerBalanceAfter = borrowerBalance + securityDeposit;

    // Update owner's balance
    const { error: ownerUpdateError } = await serviceClient
      .from("users")
      .update({
        balance: ownerBalanceAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (ownerUpdateError) {
      console.error("Failed to update owner balance:", ownerUpdateError);
      return NextResponse.json(
        { error: "Failed to process refund" },
        { status: 500 }
      );
    }

    // Update borrower's balance
    const { error: borrowerUpdateError } = await serviceClient
      .from("users")
      .update({
        balance: borrowerBalanceAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", borrowerId);

    if (borrowerUpdateError) {
      console.error("Failed to update borrower balance:", borrowerUpdateError);
      // Rollback owner balance
      await serviceClient
        .from("users")
        .update({
          balance: ownerBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      
      return NextResponse.json(
        { error: "Failed to process refund" },
        { status: 500 }
      );
    }

    // Create transaction record for owner (deduction)
    await serviceClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: "refund",
        amount: -securityDeposit,
        balance_before: ownerBalance,
        balance_after: ownerBalanceAfter,
        status: "completed",
        description: `Security deposit refund for returned item: ${order.items.title}`,
      });

    // Create transaction record for borrower (credit)
    await serviceClient
      .from("wallet_transactions")
      .insert({
        user_id: borrowerId,
        type: "refund",
        amount: securityDeposit,
        balance_before: borrowerBalance,
        balance_after: borrowerBalanceAfter,
        status: "completed",
        description: `Security deposit refund for returned item: ${order.items.title}`,
      });

    // Update order return status
    const { error: updateError } = await serviceClient
      .from("orders")
      .update({
        return_status: "approved",
        return_approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Failed to update order return status:", updateError);
      // Don't rollback wallet transactions as refund is already processed
    }

    // Unblock booking dates for this item
    // First, get booking dates before deleting them
    const { data: requestData } = await serviceClient
      .from("requests")
      .select("id")
      .eq("item_id", order.item_id)
      .eq("requester_id", borrowerId)
      .in("status", ["approved", "completed"])
      .single();

    // Check if return is on or before the last booking date (before deleting dates)
    let lastBookingDate: Date | null = null;
    if (requestData) {
      const { data: bookingDates } = await serviceClient
        .from("booking_dates")
        .select("booking_date")
        .eq("request_id", requestData.id)
        .order("booking_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (bookingDates?.booking_date) {
        lastBookingDate = new Date(bookingDates.booking_date);
      }

      // Delete booking dates to unblock them
      await serviceClient
        .from("booking_dates")
        .delete()
        .eq("request_id", requestData.id);
      
      // Optionally update request status to completed
      await serviceClient
        .from("requests")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestData.id);
    }

    // Add 10 trust points if returned on or before last date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (lastBookingDate) {
      lastBookingDate.setHours(0, 0, 0, 0);
      if (today.getTime() <= lastBookingDate.getTime()) {
        const { incrementTrustScore } = await import("@/lib/trust-score");
        await incrementTrustScore(borrowerId, 10, "Returned item on or before last date");
      }
    }

    // Create notification for the borrower
    await serviceClient
      .from("notifications")
      .insert({
        user_id: borrowerId,
        type: "order",
        title: "Return Approved",
        message: `Your return of "${order.items.title}" has been approved. Security deposit of ₹${securityDeposit.toFixed(2)} has been refunded to your wallet.`,
        link: `/orders/${id}`,
        read: false,
      });

    return NextResponse.json({
      success: true,
      message: `Return approved successfully. Security deposit of ₹${securityDeposit.toFixed(2)} has been refunded to the borrower.`,
      refundAmount: securityDeposit,
    });
  } catch (error: any) {
    console.error("Approve return error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

