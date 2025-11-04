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

    // Get the order and verify it belongs to the user
    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select(`
        *,
        service_requests(
          id,
          status,
          user_id,
          type,
          amount,
          people_needed,
          service_name,
          service_request_dates(service_date)
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

    // Check if this is a service order
    if (!order.service_request_id || !order.service_requests) {
      return NextResponse.json(
        { error: "This is not a service order" },
        { status: 400 }
      );
    }

    // Verify the user is the requester (service request owner)
    if (order.service_requests.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only mark your own service requests as completed" },
        { status: 403 }
      );
    }

    // Check if today is the last day of the service
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const serviceDates = order.service_requests.service_request_dates || [];
    if (serviceDates.length === 0) {
      return NextResponse.json(
        { error: "Service dates not found" },
        { status: 400 }
      );
    }

    // Get the last (latest) service date
    const dates = serviceDates
      .map((d: any) => new Date(d.service_date))
      .filter((d: Date) => !isNaN(d.getTime()))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime());

    if (dates.length === 0) {
      return NextResponse.json(
        { error: "No valid service dates found" },
        { status: 400 }
      );
    }

    const lastDate = new Date(dates[0]);
    lastDate.setHours(0, 0, 0, 0);

    // Check if today is exactly the last day (not before or after)
    if (today.getTime() < lastDate.getTime()) {
      return NextResponse.json(
        { 
          error: "Service cannot be marked as completed yet",
          message: `You can mark this service as completed on ${lastDate.toLocaleDateString()}`
        },
        { status: 400 }
      );
    }

    if (today.getTime() > lastDate.getTime()) {
      return NextResponse.json(
        { 
          error: "Service cannot be marked as completed",
          message: `You can only mark this service as completed on the last service date (${lastDate.toLocaleDateString()}). The last date has passed.`
        },
        { status: 400 }
      );
    }

    const serviceRequest = order.service_requests;

    // STEP 1: For paid services, transfer payments to all accepted volunteers
    // This credits each volunteer's wallet with their payment amount
    if (serviceRequest.type === "paid" && serviceRequest.amount && serviceRequest.amount > 0) {
      // Get all accepted service offers for this service request
      const { data: acceptedOffers, error: offersError } = await serviceClient
        .from("service_offers")
        .select("id, provider_id, status")
        .eq("service_request_id", serviceRequest.id)
        .eq("status", "accepted");

      if (offersError) {
        console.error("Failed to fetch accepted offers:", offersError);
        return NextResponse.json(
          { error: "Failed to fetch service offers" },
          { status: 500 }
        );
      }

      if (acceptedOffers && acceptedOffers.length > 0) {
        const amountPerPerson = parseFloat(serviceRequest.amount.toString());
        
        // Check which providers have already been paid by checking wallet transactions
        // We'll check if there are transactions for this service request
        const providerIds = acceptedOffers.map((offer: any) => offer.provider_id);
        
        // Get existing payments for this service request to avoid double payment
        const { data: existingTransactions } = await serviceClient
          .from("wallet_transactions")
          .select("user_id, amount, description")
          .in("user_id", providerIds)
          .eq("type", "service_payment")
          .eq("status", "completed")
          .like("description", `%${serviceRequest.service_name || "Service"}%`);

        // Track which providers have already been paid
        const alreadyPaidProviders = new Set(
          (existingTransactions || [])
            .filter((t: any) => t.amount > 0) // Only positive amounts (credits)
            .map((t: any) => t.user_id)
        );

        // Filter out providers who have already been paid
        const unpaidOffers = acceptedOffers.filter(
          (offer: any) => !alreadyPaidProviders.has(offer.provider_id)
        );

        if (unpaidOffers.length === 0) {
          // All providers have already been paid
          console.log("All providers have already been paid for this service");
        } else {
          const totalAmount = amountPerPerson * unpaidOffers.length;

          // Get requester's current balance
          const { data: requester } = await serviceClient
            .from("users")
            .select("balance")
            .eq("id", user.id)
            .single();

          const requesterBalance = parseFloat(requester?.balance?.toString() || "0");

          // Check if requester has enough balance
          if (requesterBalance < totalAmount) {
            return NextResponse.json(
              {
                error: "Insufficient wallet balance",
                message: `You need ₹${totalAmount.toFixed(2)} to pay ${unpaidOffers.length} ${unpaidOffers.length === 1 ? 'volunteer' : 'volunteers'}. Your current balance is ₹${requesterBalance.toFixed(2)}`,
                requiredAmount: totalAmount,
                currentBalance: requesterBalance,
              },
              { status: 402 }
            );
          }

          // Transfer payment to each unpaid provider
          const paymentResults = await Promise.all(
            unpaidOffers.map(async (offer: any) => {
              try {
                // Get provider's current balance
                const { data: provider } = await serviceClient
                  .from("users")
                  .select("balance")
                  .eq("id", offer.provider_id)
                  .single();

                if (!provider) {
                  return { success: false, providerId: offer.provider_id, error: "Provider not found" };
                }

                const providerBalanceBefore = parseFloat(provider.balance?.toString() || "0");
                const providerBalanceAfter = providerBalanceBefore + amountPerPerson;

                // Update provider's balance
                const { error: providerUpdateError } = await serviceClient
                  .from("users")
                  .update({
                    balance: providerBalanceAfter,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", offer.provider_id);

                if (providerUpdateError) {
                  console.error(`Failed to update provider ${offer.provider_id} balance:`, providerUpdateError);
                  return { success: false, providerId: offer.provider_id, error: providerUpdateError.message };
                }

                // Create transaction record for provider (credit)
                await serviceClient
                  .from("wallet_transactions")
                  .insert({
                    user_id: offer.provider_id,
                    type: "service_payment",
                    amount: amountPerPerson,
                    balance_before: providerBalanceBefore,
                    balance_after: providerBalanceAfter,
                    status: "completed",
                    description: `Payment received for completing service: ${serviceRequest.service_name || "Service"}`,
                  });

                return { success: true, providerId: offer.provider_id };
              } catch (error: any) {
                console.error(`Error processing payment for provider ${offer.provider_id}:`, error);
                return { success: false, providerId: offer.provider_id, error: error.message };
              }
            })
          );

          // Check if any payments failed
          const failedPayments = paymentResults.filter((r: any) => !r.success);
          if (failedPayments.length > 0) {
            console.error("Some payments failed:", failedPayments);
            // Continue anyway, but log the error
          }

          // Deduct total amount from requester only if we paid someone
          if (paymentResults.some((r: any) => r.success)) {
            const successfulPayments = paymentResults.filter((r: any) => r.success).length;
            const actualTotalPaid = amountPerPerson * successfulPayments;
            const requesterBalanceAfter = requesterBalance - actualTotalPaid;
            
            const { error: requesterUpdateError } = await serviceClient
              .from("users")
              .update({
                balance: requesterBalanceAfter,
                updated_at: new Date().toISOString(),
              })
              .eq("id", user.id);

            if (requesterUpdateError) {
              console.error("Failed to update requester balance:", requesterUpdateError);
              // Try to rollback provider payments if possible
              return NextResponse.json(
                { error: "Failed to process payment. Please contact support." },
                { status: 500 }
              );
            }

            // Create transaction record for requester (deduction)
            await serviceClient
              .from("wallet_transactions")
              .insert({
                user_id: user.id,
                type: "service_payment",
                amount: -actualTotalPaid,
                balance_before: requesterBalance,
                balance_after: requesterBalanceAfter,
                status: "completed",
                description: `Payment for ${successfulPayments} ${successfulPayments === 1 ? 'volunteer' : 'volunteers'} completing service: ${serviceRequest.service_name || "Service"}`,
              });
          }
        }

        // Update all accepted offers to completed status
        await serviceClient
          .from("service_offers")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("service_request_id", serviceRequest.id)
          .eq("status", "accepted");
      }
    }

    // STEP 2: Update service request status to "completed"
    // This automatically removes it from marketplace (marketplace filters by status: "open" or "in_progress")
    const { error: updateError } = await serviceClient
      .from("service_requests")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.service_request_id);

    if (updateError) {
      console.error("Failed to update service request:", updateError);
      return NextResponse.json(
        { error: "Failed to mark service as completed" },
        { status: 500 }
      );
    }

    // Add 10 trust points to requester for successfully completing a service (good deed)
    const { incrementTrustScore } = await import("@/lib/trust-score");
    await incrementTrustScore(user.id, 10, "Successfully completed a service");

    // Also update the order status if needed
    if (order.status !== "completed") {
      await serviceClient
        .from("orders")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }

    return NextResponse.json({
      success: true,
      message: "Service marked as completed successfully. Payments have been transferred to volunteers.",
    });
  } catch (error: any) {
    console.error("Complete service error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

