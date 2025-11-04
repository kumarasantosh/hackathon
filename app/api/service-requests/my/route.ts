import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";

export async function GET(request: NextRequest) {
  try {
    await headers();
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

    const serviceClient = createServiceRoleClient();

    // Fetch user's service requests with related data
    const { data: services, error } = await serviceClient
      .from("service_requests")
      .select(`
        *,
        service_request_dates(service_date),
        service_offers(id, status, provider_id)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user services:", error);
      return NextResponse.json(
        { error: "Failed to fetch services" },
        { status: 500 }
      );
    }

    // Also fetch orders for these services to get order IDs
    const serviceRequestIds = (services || []).map((s: any) => s.id);
    let ordersMap: Record<string, any> = {};

    if (serviceRequestIds.length > 0) {
      const { data: orders } = await serviceClient
        .from("orders")
        .select("id, service_request_id, status")
        .in("service_request_id", serviceRequestIds)
        .eq("user_id", user.id);

      if (orders) {
        ordersMap = orders.reduce((acc: any, order: any) => {
          if (order.service_request_id) {
            acc[order.service_request_id] = order;
          }
          return acc;
        }, {});
      }
    }

    // Add order ID to each service
    const servicesWithOrders = (services || []).map((service: any) => ({
      ...service,
      order_id: ordersMap[service.id]?.id || null,
      order_status: ordersMap[service.id]?.status || null,
    }));

    return NextResponse.json({ services: servicesWithOrders || [] });
  } catch (error) {
    console.error("Fetch user services error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

