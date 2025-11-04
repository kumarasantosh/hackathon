import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";
import { sendEmail, generateRequestEmailHTML } from "@/lib/email";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!["approved", "rejected", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const { user, error: userError } = await getOrCreateUser(userId);

    if (userError || !user) {
      return NextResponse.json(
        { error: userError || "User not found" },
        { status: 404 }
      );
    }

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Get the request with item details and booking dates
    const { data: requestData, error: fetchError } = await serviceClient
      .from("requests")
      .select(`
        *,
        items(
          id, title, user_id, status, type, amount
        ),
        requester:users!requests_requester_id_fkey(
          id, name, email
        ),
        booking_dates(
          id, booking_date, is_blocked
        )
      `)
      .eq("id", id)
      .single();

    if (fetchError || !requestData) {
      console.error("Failed to fetch request:", fetchError);
      return NextResponse.json(
        { error: "Request not found", details: fetchError?.message },
        { status: 404 }
      );
    }

    // Check if user is the item owner (for approve/reject) or requester (for cancel)
    const isItemOwner = requestData.items?.user_id === user.id;
    const isRequester = requestData.requester_id === user.id;

    if (status === "cancelled" && !isRequester) {
      return NextResponse.json(
        { error: "Only the requester can cancel a request" },
        { status: 403 }
      );
    }

    if ((status === "approved" || status === "rejected") && !isItemOwner) {
      console.error("Permission denied:", {
        userId: user.id,
        itemOwnerId: requestData.items?.user_id,
        requesterId: requestData.requester_id,
        status,
      });
      return NextResponse.json(
        { error: "Only the item owner can approve or reject requests" },
        { status: 403 }
      );
    }

    // If approving, check for date conflicts
    if (status === "approved") {
      const bookingDates = requestData.booking_dates || [];
      if (bookingDates.length > 0) {
        // Get all requested dates
        const requestedDates = bookingDates
          .map((bd: any) => bd.booking_date)
          .filter((date: string) => date); // Filter out any null/undefined

        if (requestedDates.length > 0) {
          // Check if any of these dates are already blocked by other approved requests
          const { data: conflictingBookings } = await serviceClient
            .from("booking_dates")
            .select("booking_date")
            .eq("item_id", requestData.item_id)
            .in("booking_date", requestedDates)
            .eq("is_blocked", true)
            .neq("request_id", id); // Exclude the current request

          if (conflictingBookings && conflictingBookings.length > 0) {
            const conflictingDates = conflictingBookings.map((b: any) => b.booking_date);
            return NextResponse.json(
              {
                error: "Some requested dates are no longer available",
                conflictingDates: conflictingDates,
              },
              { status: 409 } // Conflict status
            );
          }
        }
      }
    }

    // Update request status
    const { data: updatedRequest, error: updateError } = await serviceClient
      .from("requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updatedRequest) {
      return NextResponse.json(
        { error: "Failed to update request" },
        { status: 500 }
      );
    }

    // If approved or rejected, create notifications
    if (status === "approved" || status === "rejected") {
      const itemType = requestData.items?.type || "free";
      const isPaidItem = itemType === "paid" && requestData.items?.amount;
      
      // Create appropriate notification message based on item type
      let notificationTitle = `Request ${status}`;
      let notificationMessage = `Your request for "${requestData.items?.title}" has been ${status}`;
      
      if (status === "approved" && isPaidItem) {
        notificationTitle = "Payment Required - Request Approved";
        notificationMessage = `Your request for "${requestData.items?.title}" has been approved! Please complete the payment of ₹${requestData.items.amount} to proceed.`;
      }

      // Notify the requester
      await serviceClient.from("notifications").insert({
        user_id: requestData.requester_id,
        type: status === "approved" ? "approved" : "rejected",
        title: notificationTitle,
        message: notificationMessage,
        link: `/dashboard/requests?type=sent`,
      });

      // Send email to requester
      if (requestData.requester?.email) {
        let emailSubject = `Request ${status === "approved" ? "Approved" : "Rejected"}: ${requestData.items?.title}`;
        let emailContent = `<p>Your request for <strong>${requestData.items?.title}</strong> has been ${status}.</p>`;
        
        if (status === "approved" && isPaidItem) {
          emailSubject = `Payment Required - Request Approved: ${requestData.items?.title}`;
          emailContent = `
            <p>Great news! Your request for <strong>${requestData.items?.title}</strong> has been approved!</p>
            <p style="font-size: 18px; font-weight: bold; color: #3399cc; margin: 20px 0;">
              Payment Required: ₹${requestData.items.amount}
            </p>
            <p>Please complete the payment to proceed with your request. You can make the payment from your requests page.</p>
            <p style="margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/requests?type=sent" style="display: inline-block; padding: 12px 24px; background: #3399cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Payment Now</a>
            </p>
          `;
        }

        await sendEmail({
          to: requestData.requester.email,
          subject: emailSubject,
          html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>${notificationTitle}</h2>
                ${emailContent}
                ${status === "rejected" || (status === "approved" && !isPaidItem) ? `<p style="margin-top: 20px;"><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/requests?type=sent" style="display: inline-block; padding: 10px 20px; background: #3399cc; color: white; text-decoration: none; border-radius: 5px;">View Request</a></p>` : ''}
              </div>
            </body>
            </html>
          `,
        });
      }

      // If approved, handle based on item type and block booking dates
      if (status === "approved") {
        // Block all booking dates for this request
        const { error: blockError } = await serviceClient
          .from("booking_dates")
          .update({ is_blocked: true })
          .eq("request_id", id)
          .eq("is_blocked", false);

        if (blockError) {
          console.error("Failed to block booking dates:", blockError);
          // Continue anyway - dates might already be blocked
        }

        const itemType = requestData.items?.type || "free";
        
        if (itemType === "paid" && requestData.items?.amount) {
          // For paid items, create an order linked to the request
          // The requester will need to pay before the booking is confirmed
          const { data: order, error: orderError } = await serviceClient
            .from("orders")
            .insert({
              user_id: requestData.requester_id,
              item_id: requestData.item_id,
              amount: requestData.items.amount,
              status: "pending",
              request_id: requestData.id, // Link order to request
            })
            .select()
            .single();

          if (orderError) {
            console.error("Failed to create order for approved request:", orderError);
            // Continue anyway - order can be created later
          }
        }
        // Note: We do NOT change item status to "rented" here
        // Items remain "available" so other users can book other dates
        // Only the specific dates are blocked, not the entire item
      }

      // If rejected or cancelled, delete the booking dates
      // Note: Pending dates have is_blocked=false, approved dates have is_blocked=true
      // We delete all dates for this request to free them up
      if (status === "rejected" || status === "cancelled") {
        const { error: unblockError } = await serviceClient
          .from("booking_dates")
          .delete()
          .eq("request_id", id); // Delete all dates for this request, regardless of is_blocked status

        if (unblockError) {
          console.error("Failed to delete booking dates:", unblockError);
          // Continue anyway - dates might not exist
        }
      }
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Update request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

