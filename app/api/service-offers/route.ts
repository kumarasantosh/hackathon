import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";

export async function POST(request: NextRequest) {
  try {
    await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { serviceRequestId, message } = body;

    if (!serviceRequestId) {
      return NextResponse.json(
        { error: "Service request ID is required" },
        { status: 400 }
      );
    }

    if (!message || message.trim().length < 10) {
      return NextResponse.json(
        { error: "Message must be at least 10 characters" },
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
          message: "You must verify your phone number before joining service requests. Please verify your account in the dashboard.",
          redirect: "/dashboard/verify"
        },
        { status: 403 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Check if service request exists and is open
    const { data: serviceRequest, error: serviceError } = await serviceClient
      .from("service_requests")
      .select("id, status, user_id")
      .eq("id", serviceRequestId)
      .single();

    if (serviceError || !serviceRequest) {
      return NextResponse.json(
        { error: "Service request not found" },
        { status: 404 }
      );
    }

    // Allow joining if open or in_progress (in_progress means still accepting more people)
    if (serviceRequest.status !== "open" && serviceRequest.status !== "in_progress") {
      return NextResponse.json(
        { error: "Service request is no longer accepting offers" },
        { status: 400 }
      );
    }

    if (serviceRequest.user_id === user.id) {
      return NextResponse.json(
        { error: "You cannot join your own service request" },
        { status: 400 }
      );
    }

    // Check if user already has a pending offer
    const { data: existingOffer } = await serviceClient
      .from("service_offers")
      .select("id, status")
      .eq("service_request_id", serviceRequestId)
      .eq("provider_id", user.id)
      .eq("status", "pending")
      .single();

    if (existingOffer) {
      return NextResponse.json(
        { error: "You have already submitted a pending offer for this service request" },
        { status: 400 }
      );
    }

    // Get service request details to check auto_approve and people_needed
    const { data: serviceRequestDetails } = await serviceClient
      .from("service_requests")
      .select("auto_approve, people_needed, status")
      .eq("id", serviceRequestId)
      .single();

    // Check how many people are already accepted
    const { data: acceptedOffers } = await serviceClient
      .from("service_offers")
      .select("id")
      .eq("service_request_id", serviceRequestId)
      .eq("status", "accepted");

    const acceptedCount = acceptedOffers?.length || 0;
    const peopleNeeded = serviceRequestDetails?.people_needed || 1;
    const autoApprove = serviceRequestDetails?.auto_approve || false;

    // Determine initial status: auto-approve if enabled and not enough people yet
    let initialStatus = "pending";
    if (autoApprove && acceptedCount < peopleNeeded && (serviceRequestDetails?.status === "open" || serviceRequestDetails?.status === "in_progress")) {
      initialStatus = "accepted";
    }

    // Create service offer
    const { data: offer, error: offerError } = await serviceClient
      .from("service_offers")
      .insert({
        service_request_id: serviceRequestId,
        provider_id: user.id,
        message: message.trim(),
        status: initialStatus,
      })
      .select()
      .single();

    if (offerError || !offer) {
      console.error("Failed to create service offer:", offerError);
      return NextResponse.json(
        {
          error: "Failed to create service offer",
          details: process.env.NODE_ENV === "development" ? (offerError?.message || "Unknown error") : undefined
        },
        { status: 500 }
      );
    }

    // If auto-approved, check if we have enough people now
    if (initialStatus === "accepted") {
      // Get service request details for order creation
      const { data: serviceRequestData } = await serviceClient
        .from("service_requests")
        .select("type, amount, service_name, user_id")
        .eq("id", serviceRequestId)
        .single();

      const newAcceptedCount = acceptedCount + 1;
      
      // Create order for service (both paid and free)
      const orderAmount = serviceRequestData?.type === "paid" && serviceRequestData?.amount 
        ? serviceRequestData.amount 
        : 0; // Free services have amount 0

      // For paid services, check requester's balance and transfer
      if (serviceRequestData?.type === "paid" && orderAmount > 0 && serviceRequestData?.user_id) {
        // Get requester's balance
        const { data: requester } = await serviceClient
          .from("users")
          .select("balance")
          .eq("id", serviceRequestData.user_id)
          .single();

        const requesterBalance = parseFloat(requester?.balance?.toString() || "0");
        const hasEnoughBalance = requesterBalance >= orderAmount;

        if (hasEnoughBalance) {
          // Transfer amount from requester to provider
          // Deduct from requester
          await serviceClient
            .from("users")
            .update({
              balance: requesterBalance - orderAmount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", serviceRequestData.user_id);

          // Create transaction record for requester (deduction)
          await serviceClient
            .from("wallet_transactions")
            .insert({
              user_id: serviceRequestData.user_id,
              type: "service_payment",
              amount: -orderAmount,
              balance_before: requesterBalance,
              balance_after: requesterBalance - orderAmount,
              status: "completed",
              description: `Payment for service: ${serviceRequestData.service_name || "Service"}`,
            });

          // Add to provider
          const { data: provider } = await serviceClient
            .from("users")
            .select("balance")
            .eq("id", user.id)
            .single();

          const providerBalance = parseFloat(provider?.balance?.toString() || "0");
          
          await serviceClient
            .from("users")
            .update({
              balance: providerBalance + orderAmount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

          // Create transaction record for provider (credit)
          await serviceClient
            .from("wallet_transactions")
            .insert({
              user_id: user.id,
              type: "service_payment",
              amount: orderAmount,
              balance_before: providerBalance,
              balance_after: providerBalance + orderAmount,
              status: "completed",
              description: `Payment received for service: ${serviceRequestData.service_name || "Service"}`,
            });

          // Create order with completed status
          const { error: orderError } = await serviceClient
            .from("orders")
            .insert({
              user_id: user.id,
              service_request_id: serviceRequestId,
              service_offer_id: offer.id,
              amount: orderAmount,
              status: "completed",
            });

          if (orderError) {
            console.error("Failed to create service order:", orderError);
          }
        } else {
          // Insufficient balance - create order with pending status
          const { error: orderError } = await serviceClient
            .from("orders")
            .insert({
              user_id: user.id,
              service_request_id: serviceRequestId,
              service_offer_id: offer.id,
              amount: orderAmount,
              status: "pending",
            });

          if (orderError) {
            console.error("Failed to create service order:", orderError);
          }
          // Note: We still return success but the order is pending
          // The requester will need to top up their wallet
        }
      } else {
        // Free service - create order as completed
        const { error: orderError } = await serviceClient
          .from("orders")
          .insert({
            user_id: user.id,
            service_request_id: serviceRequestId,
            service_offer_id: offer.id,
            amount: orderAmount,
            status: "completed",
          });

        if (orderError) {
          console.error("Failed to create service order:", orderError);
        } else {
          // Add 10 trust points for free volunteering
          const { incrementTrustScore } = await import("@/lib/trust-score");
          await incrementTrustScore(user.id, 10, "Free volunteering");
        }
      }
      
      // Update service request status if we have enough people
      if (newAcceptedCount >= peopleNeeded) {
        await serviceClient
          .from("service_requests")
          .update({ 
            status: "in_progress",
            updated_at: new Date().toISOString()
          })
          .eq("id", serviceRequestId);
      } else {
        // Set to in_progress if at least one person is accepted
        await serviceClient
          .from("service_requests")
          .update({ 
            status: "in_progress",
            updated_at: new Date().toISOString()
          })
          .eq("id", serviceRequestId)
          .eq("status", "open");
      }
    }

    return NextResponse.json({
      success: true,
      offer: offer,
      autoApproved: initialStatus === "accepted",
    });
  } catch (error: any) {
    console.error("Create service offer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

