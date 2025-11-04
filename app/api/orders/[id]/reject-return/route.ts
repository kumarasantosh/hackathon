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
          user_id
        )
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
        { error: "You can only reject returns for your own items" },
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

    // Update order return status to rejected
    const { error: updateError } = await serviceClient
      .from("orders")
      .update({
        return_status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Failed to update order return status:", updateError);
      return NextResponse.json(
        { error: "Failed to reject return" },
        { status: 500 }
      );
    }

    // Create notification for the borrower
    const borrowerId = order.user_id;
    await serviceClient
      .from("notifications")
      .insert({
        user_id: borrowerId,
        type: "order",
        title: "Return Rejected",
        message: `Your return request for "${order.items.title}" has been rejected by the owner.`,
        link: `/orders/${id}`,
        read: false,
      });

    return NextResponse.json({
      success: true,
      message: "Return request rejected successfully.",
    });
  } catch (error: any) {
    console.error("Reject return error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

