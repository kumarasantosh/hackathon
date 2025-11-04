import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * GET /api/items/[id]/availability
 * Check which dates are available for booking for a specific item
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD) - optional, defaults to next 90 days
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await headers(); // Next.js 15 requirement
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!id) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Set date range (default to next 90 days if not provided)
    // Use local date strings to avoid timezone issues
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    let startStr: string;
    if (startDate) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return NextResponse.json(
          { error: "Invalid start date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
      startStr = startDate;
    } else {
      startStr = todayStr;
    }
    
    let endStr: string;
    if (endDate) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return NextResponse.json(
          { error: "Invalid end date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
      endStr = endDate;
    } else {
      // Calculate 90 days from today
      const endDateObj = new Date(today);
      endDateObj.setDate(endDateObj.getDate() + 90);
      endStr = endDateObj.toISOString().split('T')[0];
    }

    // Compare date strings directly (YYYY-MM-DD format compares correctly)
    if (startStr < todayStr) {
      return NextResponse.json(
        { 
          error: "Start date cannot be in the past",
          details: `Start date: ${startStr}, Today: ${todayStr}`
        },
        { status: 400 }
      );
    }

    if (endStr <= startStr) {
      return NextResponse.json(
        { 
          error: "End date must be after start date",
          details: `Start: ${startStr}, End: ${endStr}`
        },
        { status: 400 }
      );
    }

    // Convert to Date objects for database queries (using local time)
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T23:59:59');

    const serviceClient = createServiceRoleClient();

    // First, cleanup past booking dates for this item and update its status if needed
    try {
      await serviceClient.rpc('update_item_availability', { p_item_id: id });
    } catch (cleanupError) {
      console.log('Cleanup function may not exist yet, skipping:', cleanupError);
    }

    // Get all blocked dates for this item within the date range (only future dates)
    const { data: blockedDates, error } = await serviceClient
      .from("booking_dates")
      .select("booking_date")
      .eq("item_id", id)
      .eq("is_blocked", true)
      .gte("booking_date", start.toISOString().split("T")[0])
      .lte("booking_date", end.toISOString().split("T")[0]);

    if (error) {
      console.error("Error fetching blocked dates:", error);
      return NextResponse.json(
        { error: "Failed to fetch availability" },
        { status: 500 }
      );
    }

    // Convert to array of date strings
    const blockedDateStrings = new Set(
      (blockedDates || []).map((bd: any) => bd.booking_date)
    );

    // Generate all dates in range and mark which are available
    const dates: Array<{ date: string; available: boolean }> = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split("T")[0];
      dates.push({
        date: dateStr,
        available: !blockedDateStrings.has(dateStr),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      itemId: id,
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      dates,
      blockedDates: Array.from(blockedDateStrings),
    });
  } catch (error) {
    console.error("Check availability error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

