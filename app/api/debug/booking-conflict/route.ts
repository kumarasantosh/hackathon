import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Debug endpoint to check why a date is showing as booked
 * GET /api/debug/booking-conflict?itemId=xxx&date=2025-11-05
 */
export async function GET(request: NextRequest) {
  try {
    await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    const date = searchParams.get("date");

    if (!itemId || !date) {
      return NextResponse.json(
        { error: "itemId and date are required" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Get all booking_dates for this item and date
    const { data: bookingDates, error } = await serviceClient
      .from("booking_dates")
      .select(`
        *,
        requests!inner(
          id,
          status,
          requester_id,
          created_at,
          users!requests_requester_id_fkey(name)
        )
      `)
      .eq("item_id", itemId)
      .eq("booking_date", date);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch booking dates", details: error },
        { status: 500 }
      );
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const isPastDate = checkDate < today;

    // Get blocked dates specifically
    const blockedDates = bookingDates?.filter(bd => bd.is_blocked === true) || [];
    const unblockedDates = bookingDates?.filter(bd => bd.is_blocked === false) || [];

    return NextResponse.json({
      itemId,
      date,
      isPastDate,
      totalBookingDates: bookingDates?.length || 0,
      blockedDates: blockedDates.length,
      unblockedDates: unblockedDates.length,
      details: bookingDates?.map(bd => ({
        id: bd.id,
        request_id: bd.request_id,
        is_blocked: bd.is_blocked,
        created_at: bd.created_at,
        request: {
          id: bd.requests?.id,
          status: bd.requests?.status,
          requester_id: bd.requests?.requester_id,
          requester_name: bd.requests?.users?.name,
          created_at: bd.requests?.created_at,
        }
      })) || [],
      recommendation: isPastDate 
        ? "This date is in the past and should be cleaned up"
        : blockedDates.length > 0
        ? "This date is blocked by active requests"
        : "This date should be available"
    });
  } catch (error: any) {
    console.error("Debug booking conflict error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

