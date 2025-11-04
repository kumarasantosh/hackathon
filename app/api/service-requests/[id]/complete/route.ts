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

    // Get the service request and verify it belongs to the user
    const { data: serviceRequest, error: serviceError } = await serviceClient
      .from("service_requests")
      .select(`
        *,
        service_request_dates(service_date)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (serviceError || !serviceRequest) {
      return NextResponse.json(
        { error: "Service request not found" },
        { status: 404 }
      );
    }

    // Check if service is already completed or cancelled
    if (serviceRequest.status === "completed" || serviceRequest.status === "cancelled") {
      return NextResponse.json(
        { error: "Service is already completed or cancelled" },
        { status: 400 }
      );
    }

    // Check if today is the last day of the service
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const serviceDates = serviceRequest.service_request_dates || [];
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

    // Find or create an order for this service
    let order = await serviceClient
      .from("orders")
      .select("id")
      .eq("service_request_id", id)
      .eq("user_id", user.id)
      .single();

    if (!order || !order.id) {
      // Create a new order if it doesn't exist
      const { data: newOrder, error: orderError } = await serviceClient
        .from("orders")
        .insert({
          user_id: user.id,
          service_request_id: id,
          amount: serviceRequest.amount || 0,
          status: "pending",
        })
        .select("id")
        .single();

      if (orderError || !newOrder) {
        console.error("Failed to create order:", orderError);
        return NextResponse.json(
          { error: "Failed to create order" },
          { status: 500 }
        );
      }
      order = newOrder;
    }

    // Now call the complete-service logic with the order ID
    // We'll inline the logic here to avoid circular dependencies
    // Get all accepted service offers for this service request
    const { data: acceptedOffers, error: offersError } = await serviceClient
      .from("service_offers")
      .select("id, provider_id, status")
      .eq("service_request_id", id)
      .eq("status", "accepted");

    if (offersError) {
      console.error("Failed to fetch accepted offers:", offersError);
      return NextResponse.json(
        { error: "Failed to fetch service offers" },
        { status: 500 }
      );
    }

    // For paid services, transfer payments to all accepted volunteers
    if (serviceRequest.type === "paid" && serviceRequest.amount && serviceRequest.amount > 0 && acceptedOffers && acceptedOffers.length > 0) {
      const amountPerPerson = parseFloat(serviceRequest.amount.toString());
      
      // Check which providers have already been paid
      const providerIds = acceptedOffers.map((offer: any) => offer.provider_id);
      
      const { data: existingTransactions } = await serviceClient
        .from("wallet_transactions")
        .select("user_id, amount, description")
        .in("user_id", providerIds)
        .eq("type", "service_payment")
        .eq("status", "completed")
        .like("description", `%${serviceRequest.service_name || "Service"}%`);

      const alreadyPaidProviders = new Set(
        (existingTransactions || [])
          .filter((t: any) => t.amount > 0)
          .map((t: any) => t.user_id)
      );

      const unpaidOffers = acceptedOffers.filter(
        (offer: any) => !alreadyPaidProviders.has(offer.provider_id)
      );

      if (unpaidOffers.length > 0) {
        const totalAmount = amountPerPerson * unpaidOffers.length;

        const { data: requester } = await serviceClient
          .from("users")
          .select("balance")
          .eq("id", user.id)
          .single();

        const requesterBalance = parseFloat(requester?.balance?.toString() || "0");

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
            return NextResponse.json(
              { error: "Failed to process payment. Please contact support." },
              { status: 500 }
            );
          }

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
        .eq("service_request_id", id)
        .eq("status", "accepted");
    }

    // Update service request status to "completed"
    const { error: updateError } = await serviceClient
      .from("service_requests")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

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

    // Update the order status
    await serviceClient
      .from("orders")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

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

