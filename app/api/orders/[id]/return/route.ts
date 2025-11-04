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

    // Get the order and verify it belongs to the user (borrower)
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
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if this is an item order (not a service order)
    if (!order.item_id || !order.items) {
      return NextResponse.json(
        { error: "This is not an item order" },
        { status: 400 }
      );
    }

    // Check if order is completed
    if (order.status !== "completed") {
      return NextResponse.json(
        { error: "Order must be completed before returning item" },
        { status: 400 }
      );
    }

    // Check if already returned
    if (order.return_status === "approved") {
      return NextResponse.json(
        { error: "Item has already been returned and approved" },
        { status: 400 }
      );
    }

    // Check if return is already pending
    if (order.return_status === "pending") {
      return NextResponse.json(
        { error: "Return request is already pending approval" },
        { status: 400 }
      );
    }

    // Try multiple methods to find booking dates
    let bookingDates: any[] = [];
    
    // Method 1: Try to find booking dates through request_id field on order (if it exists)
    if ((order as any).request_id) {
      const { data: dates } = await serviceClient
        .from("booking_dates")
        .select("booking_date, is_blocked")
        .eq("request_id", (order as any).request_id)
        .eq("is_blocked", true)
        .order("booking_date", { ascending: false });
      
      if (dates && dates.length > 0) {
        bookingDates = dates;
      }
    }
    
    // Method 2: If no dates found, try to find request associated with this order
    if (bookingDates.length === 0) {
      const { data: request } = await serviceClient
        .from("requests")
        .select("id")
        .eq("item_id", order.item_id)
        .eq("requester_id", user.id)
        .in("status", ["approved", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (request) {
        const { data: dates } = await serviceClient
          .from("booking_dates")
          .select("booking_date, is_blocked")
          .eq("request_id", request.id)
          .eq("is_blocked", true)
          .order("booking_date", { ascending: false });
        
        if (dates && dates.length > 0) {
          bookingDates = dates;
        }
      }
    }
    
    // Method 3: If still no dates, try to find booking dates directly by item_id and user's requests
    if (bookingDates.length === 0) {
      // Get all approved/completed requests for this item and user
      const { data: requests } = await serviceClient
        .from("requests")
        .select("id")
        .eq("item_id", order.item_id)
        .eq("requester_id", user.id)
        .in("status", ["approved", "completed"]);

      if (requests && requests.length > 0) {
        const requestIds = requests.map(r => r.id);
        const { data: dates } = await serviceClient
          .from("booking_dates")
          .select("booking_date, is_blocked")
          .in("request_id", requestIds)
          .eq("is_blocked", true)
          .order("booking_date", { ascending: false });
        
        if (dates && dates.length > 0) {
          bookingDates = dates;
        }
      }
    }

    if (!bookingDates || bookingDates.length === 0) {
      return NextResponse.json(
        { 
          error: "No booking dates found for this order",
          message: "This order may not have associated booking dates. Please contact support if you believe this is an error."
        },
        { status: 400 }
      );
    }

    // Get the last booking date
    const lastBookingDate = new Date(bookingDates[0].booking_date);
    lastBookingDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if today is the last booking date (not before or after)
    if (today.getTime() < lastBookingDate.getTime()) {
      return NextResponse.json(
        { 
          error: "Item cannot be returned yet",
          message: `You can return this item on ${lastBookingDate.toLocaleDateString()}`
        },
        { status: 400 }
      );
    }

    if (today.getTime() > lastBookingDate.getTime()) {
      return NextResponse.json(
        { 
          error: "Item cannot be returned",
          message: `You can only return this item on the last booking date (${lastBookingDate.toLocaleDateString()}). The last date has passed.`
        },
        { status: 400 }
      );
    }

    // Update order with return status
    const { error: updateError } = await serviceClient
      .from("orders")
      .update({
        return_status: "pending",
        return_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Failed to update order return status:", updateError);
      return NextResponse.json(
        { error: "Failed to request return" },
        { status: 500 }
      );
    }

    // Create notification for the owner
    const ownerId = order.items.user_id;
    await serviceClient
      .from("notifications")
      .insert({
        user_id: ownerId,
        type: "order",
        title: "Item Return Requested",
        message: `${user.name || "A borrower"} has requested to return "${order.items.title}". Please review and approve to refund the security deposit.`,
        link: `/dashboard/requests?return=${id}`,
        read: false,
      });

    return NextResponse.json({
      success: true,
      message: "Return request submitted successfully. The owner will be notified and can approve the return.",
    });
  } catch (error: any) {
    console.error("Return item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

