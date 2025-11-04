import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";

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

    if (!["accepted", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'accepted' or 'rejected'" },
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

    const serviceClient = createServiceRoleClient();

    // Get the service offer with service request details
    const { data: offerData, error: fetchError } = await serviceClient
      .from("service_offers")
      .select(`
        *,
        service_requests(
          id, user_id, status, service_name
        )
      `)
      .eq("id", id)
      .single();

    if (fetchError || !offerData) {
      return NextResponse.json(
        { error: "Service offer not found" },
        { status: 404 }
      );
    }

    // Check if user is the owner of the service request
    if (offerData.service_requests.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only manage offers for your own service requests" },
        { status: 403 }
      );
    }

    // Check if service request is still open or in_progress (can still accept more people)
    if (offerData.service_requests.status !== "open" && offerData.service_requests.status !== "in_progress") {
      return NextResponse.json(
        { error: "Service request is no longer accepting offers" },
        { status: 400 }
      );
    }

    // If accepting, check if we already have enough people
    if (status === "accepted") {
      const { data: serviceRequestDetails } = await serviceClient
        .from("service_requests")
        .select("people_needed")
        .eq("id", offerData.service_request_id)
        .single();

      const peopleNeeded = serviceRequestDetails?.people_needed || 1;

      // Count currently accepted offers (excluding this one)
      const { data: existingAccepted } = await serviceClient
        .from("service_offers")
        .select("id")
        .eq("service_request_id", offerData.service_request_id)
        .eq("status", "accepted")
        .neq("id", id);

      const acceptedCount = existingAccepted?.length || 0;

      // Only check if we need more people (allow multiple accepts if people_needed > 1)
      if (peopleNeeded === 1 && acceptedCount >= 1) {
        return NextResponse.json(
          { error: "This service request only needs 1 person and already has an accepted offer" },
          { status: 400 }
        );
      }

      // Check if we've reached the limit
      if (acceptedCount >= peopleNeeded) {
        return NextResponse.json(
          { error: `This service request already has ${peopleNeeded} accepted offer${peopleNeeded > 1 ? 's' : ''}` },
          { status: 400 }
        );
      }
    }

    // Update offer status
    const { data: updatedOffer, error: updateError } = await serviceClient
      .from("service_offers")
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updatedOffer) {
      return NextResponse.json(
        { error: "Failed to update service offer" },
        { status: 500 }
      );
    }

    // If accepted, check if we have enough people and update status accordingly
    if (status === "accepted") {
      // Get service request details for order creation
      const { data: serviceRequestDetails } = await serviceClient
        .from("service_requests")
        .select("people_needed, type, amount, service_name")
        .eq("id", offerData.service_request_id)
        .single();

      const peopleNeeded = serviceRequestDetails?.people_needed || 1;

      // Count all accepted offers (including the one we just accepted)
      const { data: allAccepted } = await serviceClient
        .from("service_offers")
        .select("id")
        .eq("service_request_id", offerData.service_request_id)
        .eq("status", "accepted");

      const acceptedCount = allAccepted?.length || 0;

      // Create order for service (both paid and free)
      const { data: offerWithProvider } = await serviceClient
        .from("service_offers")
        .select("provider_id")
        .eq("id", id)
        .single();

      if (offerWithProvider?.provider_id) {
        const orderAmount = serviceRequestDetails?.type === "paid" && serviceRequestDetails?.amount 
          ? serviceRequestDetails.amount 
          : 0; // Free services have amount 0

        // For paid services, check requester's balance and transfer
        if (serviceRequestDetails?.type === "paid" && orderAmount > 0) {
          // Get requester's balance
          const { data: requester } = await serviceClient
            .from("users")
            .select("balance")
            .eq("id", offerData.service_requests.user_id)
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
              .eq("id", offerData.service_requests.user_id);

            // Create transaction record for requester (deduction)
            await serviceClient
              .from("wallet_transactions")
              .insert({
                user_id: offerData.service_requests.user_id,
                type: "service_payment",
                amount: -orderAmount, // Negative for deduction
                balance_before: requesterBalance,
                balance_after: requesterBalance - orderAmount,
                status: "completed",
                description: `Payment for service: ${serviceRequestDetails?.service_name || "Service"}`,
              });

            // Add to provider
            const { data: provider } = await serviceClient
              .from("users")
              .select("balance")
              .eq("id", offerWithProvider.provider_id)
              .single();

            const providerBalance = parseFloat(provider?.balance?.toString() || "0");
            
            await serviceClient
              .from("users")
              .update({
                balance: providerBalance + orderAmount,
                updated_at: new Date().toISOString(),
              })
              .eq("id", offerWithProvider.provider_id);

            // Create transaction record for provider (credit)
            await serviceClient
              .from("wallet_transactions")
              .insert({
                user_id: offerWithProvider.provider_id,
                type: "service_payment",
                amount: orderAmount,
                balance_before: providerBalance,
                balance_after: providerBalance + orderAmount,
                status: "completed",
                description: `Payment received for service: ${serviceRequestDetails?.service_name || "Service"}`,
              });

            // Create order with completed status
            const { error: orderError } = await serviceClient
              .from("orders")
              .insert({
                user_id: offerWithProvider.provider_id,
                service_request_id: offerData.service_request_id,
                service_offer_id: id,
                amount: orderAmount,
                status: "completed",
              });

            if (orderError) {
              console.error("Failed to create service order:", orderError);
            }
          } else {
            // Insufficient balance - create order with pending status
            // The requester will need to top up their wallet
            const { error: orderError } = await serviceClient
              .from("orders")
              .insert({
                user_id: offerWithProvider.provider_id,
                service_request_id: offerData.service_request_id,
                service_offer_id: id,
                amount: orderAmount,
                status: "pending", // Pending until wallet is topped up
              });

            if (orderError) {
              console.error("Failed to create service order:", orderError);
            } else {
              // Return error indicating insufficient balance
              return NextResponse.json(
                {
                  error: "Insufficient wallet balance",
                  message: `Requester has insufficient balance. Required: ₹${orderAmount}, Available: ₹${requesterBalance.toFixed(2)}`,
                  insufficientBalance: true,
                  requiredAmount: orderAmount,
                  currentBalance: requesterBalance,
                },
                { status: 402 } // Payment Required
              );
            }
          }
        } else {
          // Free service - create order as completed
          const { error: orderError } = await serviceClient
            .from("orders")
            .insert({
              user_id: offerWithProvider.provider_id,
              service_request_id: offerData.service_request_id,
              service_offer_id: id,
              amount: orderAmount,
              status: "completed",
            });

          if (orderError) {
            console.error("Failed to create service order:", orderError);
          } else {
            // Add 10 trust points for free volunteering
            const { incrementTrustScore } = await import("@/lib/trust-score");
            await incrementTrustScore(offerWithProvider.provider_id, 10, "Free volunteering");
          }
        }
      }

      // Update service request status
      if (acceptedCount >= peopleNeeded) {
        // We have enough people, set to in_progress
        await serviceClient
          .from("service_requests")
          .update({ 
            status: "in_progress",
            updated_at: new Date().toISOString()
          })
          .eq("id", offerData.service_request_id);
      } else {
        // Set to in_progress if at least one person is accepted
        await serviceClient
          .from("service_requests")
          .update({ 
            status: "in_progress",
            updated_at: new Date().toISOString()
          })
          .eq("id", offerData.service_request_id)
          .eq("status", "open");
      }
    }

    return NextResponse.json({
      success: true,
      offer: updatedOffer,
    });
  } catch (error: any) {
    console.error("Update service offer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

