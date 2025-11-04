import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Fetch user's orders with item details
    const { data: orders, error } = await serviceClient
      .from("orders")
      .select(`
        *,
        items(
          id, title, description, category, images, location, type, amount, user_id,
          users(name)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Fetch booking dates for item orders - try multiple methods
    const itemOrders = (orders || []).filter((order: any) => order.item_id && !order.service_request_id);
    let bookingDatesMap: Record<string, any[]> = {};
    
    if (itemOrders.length > 0) {
      // Get all item IDs and user IDs for these orders
      const itemIds = itemOrders.map((o: any) => o.item_id);
      const userIds = itemOrders.map((o: any) => o.user_id);
      
      // Method 1: Try to find booking dates through requests
      const { data: requests } = await serviceClient
        .from("requests")
        .select("id, item_id, requester_id")
        .in("item_id", itemIds)
        .in("requester_id", userIds)
        .in("status", ["approved", "completed"]);

      if (requests && requests.length > 0) {
        const requestIds = requests.map((r: any) => r.id);
        const { data: bookingDates } = await serviceClient
          .from("booking_dates")
          .select("booking_date, is_blocked, request_id, item_id")
          .in("request_id", requestIds)
          .eq("is_blocked", true);

        if (bookingDates) {
          // Group by request_id first, then map to item_id based on request
          const requestToItemMap: Record<string, string> = {};
          requests.forEach((r: any) => {
            requestToItemMap[r.id] = r.item_id;
          });

          bookingDates.forEach((bd: any) => {
            const itemId = requestToItemMap[bd.request_id];
            if (itemId) {
              if (!bookingDatesMap[itemId]) {
                bookingDatesMap[itemId] = [];
              }
              bookingDatesMap[itemId].push(bd);
            }
          });
        }
      }
      
      // Method 2: If order has request_id, try to get booking dates directly
      for (const order of itemOrders) {
        if ((order as any).request_id && !bookingDatesMap[order.item_id]) {
          const { data: dates } = await serviceClient
            .from("booking_dates")
            .select("booking_date, is_blocked")
            .eq("request_id", (order as any).request_id)
            .eq("is_blocked", true);
          
          if (dates && dates.length > 0) {
            bookingDatesMap[order.item_id] = dates;
          }
        }
      }
    }

    // Add booking dates to orders
    const ordersWithBookingDates = (orders || []).map((order: any) => {
      if (order.item_id && bookingDatesMap[order.item_id]) {
        return {
          ...order,
          booking_dates: bookingDatesMap[order.item_id],
        };
      }
      return order;
    });

    if (error) {
      console.error("Error fetching orders:", error);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    // Fetch service details separately for service orders
    const serviceOrderIds = (orders || [])
      .filter((order: any) => order.service_request_id)
      .map((order: any) => order.service_request_id);

    let serviceRequestsMap: Record<string, any> = {};
    let serviceOffersMap: Record<string, any> = {};

    if (serviceOrderIds.length > 0) {
      // Fetch service requests with dates
      const { data: serviceRequests, error: srError } = await serviceClient
        .from("service_requests")
        .select(`
          id, service_name, description, location, type, amount, status,
          users!service_requests_user_id_fkey(id, name),
          service_request_dates(service_date)
        `)
        .in("id", serviceOrderIds);

      if (!srError && serviceRequests) {
        serviceRequestsMap = serviceRequests.reduce((acc: any, sr: any) => {
          acc[sr.id] = sr;
          return acc;
        }, {});
      }

      // Fetch service offers
      const serviceOfferIds = (orders || [])
        .filter((order: any) => order.service_offer_id)
        .map((order: any) => order.service_offer_id);

      if (serviceOfferIds.length > 0) {
        const { data: serviceOffers, error: soError } = await serviceClient
          .from("service_offers")
          .select("id, message, status")
          .in("id", serviceOfferIds);

        if (!soError && serviceOffers) {
          serviceOffersMap = serviceOffers.reduce((acc: any, so: any) => {
            acc[so.id] = so;
            return acc;
          }, {});
        }
      }
    }

    // Combine the data
    const ordersWithServices = (ordersWithBookingDates || []).map((order: any) => {
      if (order.service_request_id) {
        return {
          ...order,
          service_requests: serviceRequestsMap[order.service_request_id] || null,
          service_offers: order.service_offer_id ? serviceOffersMap[order.service_offer_id] || null : null,
        };
      }
      return order;
    });

    return NextResponse.json({ orders: ordersWithServices || [] });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

