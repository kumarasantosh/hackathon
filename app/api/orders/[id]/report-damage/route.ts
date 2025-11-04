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
    const { description } = await request.json();

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: "Damage description is required" },
        { status: 400 }
      );
    }

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
        ),
        users!orders_user_id_fkey(id, name)
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
        { error: "You can only report damage for your own items" },
        { status: 403 }
      );
    }

    // Check if return is approved
    if (order.return_status !== "approved") {
      return NextResponse.json(
        { error: "Return must be approved before reporting damage" },
        { status: 400 }
      );
    }

    // Check if damage is already reported
    if (order.damage_reported === true) {
      return NextResponse.json(
        { error: "Damage has already been reported for this order" },
        { status: 400 }
      );
    }

    // Update order with damage report
    const { error: updateError } = await serviceClient
      .from("orders")
      .update({
        damage_reported: true,
        damage_description: description.trim(),
        damage_reported_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Failed to update order with damage report:", updateError);
      return NextResponse.json(
        { error: "Failed to report damage" },
        { status: 500 }
      );
    }

    // Reduce borrower's trust score by 10 points
    const borrowerId = order.user_id;
    
    console.log(`Attempting to reduce trust score for borrower: ${borrowerId}`);
    
    // Get borrower's current trust score
    const { data: borrowerBefore, error: borrowerFetchError } = await serviceClient
      .from("users")
      .select("trust_score, name")
      .eq("id", borrowerId)
      .single();
    
    if (borrowerFetchError || !borrowerBefore) {
      console.error("Failed to fetch borrower before trust score update:", borrowerFetchError);
      return NextResponse.json(
        { error: "Failed to fetch borrower information" },
        { status: 500 }
      );
    }
    
    const currentTrustScore = borrowerBefore.trust_score || 0;
    const newTrustScore = Math.max(0, currentTrustScore - 10);
    
    console.log(`Borrower ${borrowerBefore.name} (${borrowerId}): Current trust score: ${currentTrustScore}, New trust score: ${newTrustScore}`);
    
    try {
      const { incrementTrustScore } = await import("@/lib/trust-score");
      await incrementTrustScore(borrowerId, -10, `Damage reported for item: ${order.items.title}`);
      
      // Verify the trust score was updated
      const { data: borrowerAfter } = await serviceClient
        .from("users")
        .select("trust_score")
        .eq("id", borrowerId)
        .single();
      
      console.log(`Trust score update verified for borrower ${borrowerId}: ${borrowerAfter?.trust_score}`);
      
      if (borrowerAfter?.trust_score !== newTrustScore) {
        console.error(`Trust score mismatch! Expected: ${newTrustScore}, Got: ${borrowerAfter?.trust_score}`);
      }
    } catch (trustScoreError: any) {
      console.error("Error updating trust score:", trustScoreError);
      // Try direct update as fallback
      const { error: directUpdateError } = await serviceClient
        .from("users")
        .update({
          trust_score: newTrustScore,
          updated_at: new Date().toISOString(),
        })
        .eq("id", borrowerId);
      
      if (directUpdateError) {
        console.error("Direct trust score update also failed:", directUpdateError);
        return NextResponse.json(
          { error: "Failed to update trust score", details: directUpdateError.message },
          { status: 500 }
        );
      } else {
        console.log(`Direct trust score update succeeded: ${borrowerId} -> ${newTrustScore}`);
      }
    }

    // Create notification for the borrower
    try {
      await serviceClient
        .from("notifications")
        .insert({
          user_id: borrowerId,
          type: "order",
          title: "Damage Reported",
          message: `The owner has reported damage for "${order.items.title}". Your trust score has been reduced.`,
          link: `/orders/${id}`,
          read: false,
        });
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
      // Continue even if notification fails
    }

    return NextResponse.json({
      success: true,
      message: "Damage reported successfully. Borrower's trust score has been reduced.",
      borrowerId: borrowerId,
    });
  } catch (error: any) {
    console.error("Report damage error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

