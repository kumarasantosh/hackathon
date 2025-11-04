import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";
import { sendEmail, generateRequestEmailHTML } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, bookingDates } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Validate booking dates
    if (!bookingDates || !Array.isArray(bookingDates) || bookingDates.length === 0) {
      return NextResponse.json(
        { error: "At least one booking date is required" },
        { status: 400 }
      );
    }

    // Get or create user from database
    const { user, error: userError } = await getOrCreateUser(userId);

    if (userError || !user) {
      return NextResponse.json(
        { error: userError || "User not found" },
        { status: 404 }
      );
    }

    // Check if user is verified
    if (!user.verified) {
      return NextResponse.json(
        { 
          error: "Account verification required",
          message: "You must verify your phone number before sending requests. Please verify your account in the dashboard.",
          redirect: "/dashboard/verify"
        },
        { status: 403 }
      );
    }

    // Log the dates being sent for debugging
    console.log("Request received - itemId:", itemId, "bookingDates:", bookingDates);

    // Validate date format and ensure dates are in the future
    // Use local timezone to avoid date shifts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const validDates: Date[] = [];
    const dateStrings: string[] = [];
    
    for (const dateStr of bookingDates) {
      // Parse date string directly (YYYY-MM-DD format) without timezone conversion
      // This prevents dates from shifting due to UTC conversion
      const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) {
        return NextResponse.json(
          { error: `Invalid date format: ${dateStr}. Expected YYYY-MM-DD` },
          { status: 400 }
        );
      }
      
      // Create date in local timezone to avoid shifts
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1; // Month is 0-indexed
      const day = parseInt(dateMatch[3], 10);
      const date = new Date(year, month, day);
      
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: `Invalid date: ${dateStr}` },
          { status: 400 }
        );
      }
      
      date.setHours(0, 0, 0, 0);
      
      if (date < today) {
        return NextResponse.json(
          { error: "Booking dates must be in the future" },
          { status: 400 }
        );
      }
      
      validDates.push(date);
      // Keep the original date string format (YYYY-MM-DD) to avoid any conversion issues
      dateStrings.push(dateStr);
    }
    
    // Log the validated dates
    console.log("Validated dates to check:", dateStrings);

    const supabase = await createClient();

    // Verify item exists
    // Note: We don't check status anymore - availability is controlled by booking_dates
    // Items can be requested even if status is "rented" as long as dates are available
    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("*, users(id, email, name)")
      .eq("id", itemId)
      .in("status", ["available", "rented"]) // Allow both available and rented items
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }
    
    // Don't allow booking if item is sold
    if (item.status === "sold") {
      return NextResponse.json(
        { error: "This item is no longer available" },
        { status: 400 }
      );
    }

    // Check if user is trying to request their own item
    if (item.user_id === user.id) {
      return NextResponse.json(
        { error: "You cannot request your own item" },
        { status: 400 }
      );
    }

    // Check if there's already a pending request
    const { data: existingRequest } = await supabase
      .from("requests")
      .select("id")
      .eq("requester_id", user.id)
      .eq("item_id", itemId)
      .eq("status", "pending")
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending request for this item" },
        { status: 400 }
      );
    }

    // Use service role client to check date availability
    const serviceClient = createServiceRoleClient();

    // First, cleanup past booking dates for this item
    try {
      await serviceClient.rpc('update_item_availability', { p_item_id: itemId });
    } catch (cleanupError) {
      console.log('Cleanup function may not exist yet, skipping:', cleanupError);
    }

    // Check if any of the requested dates are already booked (only future dates matter)
    // Also exclude past dates from conflict check
    const todayStr = today.toISOString().split('T')[0];
    
    // First, get all blocked dates for this item on the requested dates that are in the future
    // IMPORTANT: Only check the dates that were actually selected (dateStrings)
    console.log("Checking for conflicts on these dates only:", dateStrings);
    
    const { data: allBlockedDates } = await serviceClient
      .from("booking_dates")
      .select("booking_date, request_id")
      .eq("item_id", itemId)
      .in("booking_date", dateStrings) // Only check the dates that were selected
      .eq("is_blocked", true)
      .gte("booking_date", todayStr); // Only check future dates

    console.log("Found blocked dates:", allBlockedDates?.map(bd => bd.booking_date) || []);

    if (!allBlockedDates || allBlockedDates.length === 0) {
      // No conflicts, proceed
      console.log("No conflicts found, proceeding with request");
    } else {
      // Get all request IDs that have blocked dates
      const requestIds = Array.from(new Set(
        allBlockedDates.map(bd => bd.request_id).filter(id => id)
      ));
      
      if (requestIds.length > 0) {
        // Fetch the requests to check their status
        const { data: requests } = await serviceClient
          .from("requests")
          .select("id, requester_id, status")
          .in("id", requestIds);
        
        // If we have blocked dates but no valid requests, clean them up
        // This handles orphaned booking_dates records
        const validRequestIds = new Set<string>();
        if (requests && requests.length > 0) {
          requests.forEach(r => validRequestIds.add(r.id));
        }
        
        // Filter blocked dates to only include those from requests that actually exist
        let validBlockedDates = allBlockedDates.filter(
          bd => bd.request_id && validRequestIds.has(bd.request_id)
        );
        
        // Also clean up orphaned booking_dates (dates with request_ids that don't exist)
        const orphanedRequestIds = Array.from(
          new Set(allBlockedDates
            .filter(bd => bd.request_id && !validRequestIds.has(bd.request_id))
            .map(bd => bd.request_id))
        );
        
        if (orphanedRequestIds.length > 0) {
          console.warn(`Found ${orphanedRequestIds.length} orphaned booking_dates, cleaning up...`);
          // Clean up orphaned dates in background (don't block the request)
          serviceClient
            .from("booking_dates")
            .delete()
            .in("request_id", orphanedRequestIds)
            .then(() => console.log("Orphaned booking_dates cleaned up"))
            .catch(err => console.error("Failed to clean up orphaned dates:", err));
        }
        
        // Filter to only keep conflicts from active, valid requests
        const activeRequestIds = new Set<string>();
        
        if (requests && requests.length > 0) {
          for (const req of requests) {
            // Skip user's own rejected/cancelled requests
            if (req.requester_id === user.id && 
                (req.status === "rejected" || req.status === "cancelled")) {
              continue;
            }
            
            // Only include approved or completed requests
            // (completed requests should only have future dates, past ones should be cleaned up)
            if (req.status === "approved" || req.status === "completed") {
              activeRequestIds.add(req.id);
            }
          }
        }
        
        // Filter blocked dates to only include those from active requests
        const conflictingDates = validBlockedDates.filter(
          bd => bd.request_id && activeRequestIds.has(bd.request_id)
        );
        
        if (conflictingDates.length > 0) {
          // Check if any of these conflicting dates are actually in the past (extra safety check)
          const futureConflicts = conflictingDates.filter(bd => {
            const conflictDate = new Date(bd.booking_date);
            conflictDate.setHours(0, 0, 0, 0);
            return conflictDate >= today;
          });
          
          if (futureConflicts.length > 0) {
            // Only return conflicts for dates that were actually selected
            // Filter out any dates that weren't in the original request
            const selectedConflicts = futureConflicts
              .filter(cd => dateStrings.includes(cd.booking_date))
              .map(cd => cd.booking_date);
            
            const uniqueConflicting = Array.from(new Set(selectedConflicts));
            
            console.log("CONFLICT DETECTED - Requested dates:", dateStrings, "Conflicting dates:", uniqueConflicting);
            console.log("All blocked dates found:", allBlockedDates);
            console.log("Valid blocked dates:", validBlockedDates);
            console.log("Future conflicts (before filtering):", futureConflicts);
            
            // Only return error if there are conflicts on dates that were actually selected
            if (uniqueConflicting.length > 0) {
              return NextResponse.json(
                { 
                  error: "Some selected dates are already booked",
                  conflictingDates: uniqueConflicting
                },
                { status: 400 }
              );
            }
          }
        }
      } else {
        // If we have blocked dates but no request IDs, they're orphaned - clean them up
        if (allBlockedDates.length > 0) {
          console.warn(`Found ${allBlockedDates.length} booking_dates without valid request_ids, cleaning up...`);
          // Clean up in background
          serviceClient
            .from("booking_dates")
            .delete()
            .in("booking_date", dateStrings)
            .eq("item_id", itemId)
            .eq("is_blocked", true)
            .is("request_id", null)
            .then(() => console.log("Orphaned booking_dates without request_id cleaned up"))
            .catch(err => console.error("Failed to clean up orphaned dates:", err));
        }
      }
    }

    // Create request record
    const { data: requestRecord, error: requestError } = await serviceClient
      .from("requests")
      .insert({
        requester_id: user.id,
        item_id: itemId,
        status: "pending",
        message: body.message || null,
      })
      .select()
      .single();

    if (requestError || !requestRecord) {
      console.error("Failed to create request:", requestError);
      return NextResponse.json(
        { error: "Failed to create request" },
        { status: 500 }
      );
    }

    // Create booking dates for this request
    const bookingDateRecords = dateStrings.map(dateStr => ({
      request_id: requestRecord.id,
      item_id: itemId,
      booking_date: dateStr,
      is_blocked: false, // Will be set to true when approved
    }));

    const { error: bookingDatesError } = await serviceClient
      .from("booking_dates")
      .insert(bookingDateRecords);

    if (bookingDatesError) {
      console.error("Failed to create booking dates:", bookingDatesError);
      // Clean up the request if booking dates fail
      await serviceClient.from("requests").delete().eq("id", requestRecord.id);
      return NextResponse.json(
        { error: "Failed to save booking dates" },
        { status: 500 }
      );
    }

    // Create notification for item owner
    const { error: notifError } = await serviceClient
      .from("notifications")
      .insert({
        user_id: item.user_id,
        type: "request",
        title: "New Item Request",
        message: `${user.name || "Someone"} requested your item: ${item.title}`,
        link: `/dashboard/requests?item=${itemId}`,
      });

    if (notifError) {
      console.error("Failed to create notification:", notifError);
      // Don't fail the request if notification fails
    }

    // Send email notification to item owner
    if (item.users?.email) {
      const emailSent = await sendEmail({
        to: item.users.email,
        subject: `New Request: ${item.title}`,
        html: generateRequestEmailHTML(
          user.name || "A neighbor",
          item.title,
          item.users?.name || "there",
          body.message
        ),
      });

      if (!emailSent) {
        console.error("Failed to send email notification");
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Request sent successfully",
      requestId: requestRecord.id,
    });
  } catch (error) {
    console.error("Request item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

