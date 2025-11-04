import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * POST /api/admin/cleanup-booking-dates
 * Cleanup past booking dates and make items available again
 * Can be called as a scheduled job (cron) or manually
 */
export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceRoleClient();

    // Call the cleanup function
    const { data, error } = await serviceClient.rpc('cleanup_past_booking_dates');

    if (error) {
      console.error("Cleanup error:", error);
      return NextResponse.json(
        { error: "Failed to cleanup past booking dates", details: error.message },
        { status: 500 }
      );
    }

    const result = Array.isArray(data) && data.length > 0 ? data[0] : { items_updated: 0, dates_deleted: 0 };

    return NextResponse.json({
      success: true,
      message: "Cleanup completed successfully",
      itemsUpdated: result.items_updated || 0,
      datesDeleted: result.dates_deleted || 0,
    });
  } catch (error: any) {
    console.error("Cleanup booking dates error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

