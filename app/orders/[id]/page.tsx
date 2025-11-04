import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getOrCreateUser } from "@/lib/user-helpers";
import { PaymentLoading } from "@/components/payment-loading";
import { MarkServiceCompletedButton } from "@/components/mark-service-completed-button";
import { ReturnItemButton } from "@/components/return-item-button";
import { ReportDamageButton } from "@/components/report-damage-button";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment_id?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  await headers();
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Get user from database
  const supabase = await createClient();
  const { user } = await getOrCreateUser(userId);
  
  if (!user) {
    redirect("/sign-in");
  }

  // Use service role client to bypass RLS, but filter by user_id for security
  const serviceClient = createServiceRoleClient();

  // Fetch order - first get it without permission filter to check existence
  const { data: order, error: orderError } = await serviceClient
    .from("orders")
    .select(`
      *,
      items(id, title, description, category, amount, user_id),
      users(name),
      service_requests(
        id,
        service_name,
        status,
        user_id,
        service_request_dates(service_date)
      )
    `)
    .eq("id", id)
    .single();

  // Check if order exists and user has permission (borrower or owner)
  let hasError = !!orderError;
  let finalOrder = order;
  
  if (!orderError && order) {
    // Verify user has permission: either borrower or item owner
    const isBorrower = order.user_id === user.id;
    const isOwner = order.items?.user_id === user.id;
    
    if (!isBorrower && !isOwner) {
      // User doesn't have permission - treat as not found for security
      hasError = true;
      finalOrder = null;
    }
  }

  // Fetch booking dates for item orders - try multiple methods
  let bookingDates: any[] = [];
  if (finalOrder && finalOrder.item_id && !finalOrder.service_request_id) {
    // Method 1: Try to find booking dates through request_id field on order (if it exists)
    if ((finalOrder as any).request_id) {
      const { data: dates } = await serviceClient
        .from("booking_dates")
        .select("booking_date, is_blocked")
        .eq("request_id", (finalOrder as any).request_id)
        .eq("is_blocked", true)
        .order("booking_date", { ascending: false });
      
      if (dates && dates.length > 0) {
        bookingDates = dates;
      }
    }
    
    // Method 2: If no dates found, try to find request associated with this order
    if (bookingDates.length === 0) {
      const { data: request } = await serviceClient
        .from("requests")
        .select("id")
        .eq("item_id", finalOrder.item_id)
        .eq("requester_id", user.id)
        .in("status", ["approved", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (request) {
        const { data: dates } = await serviceClient
          .from("booking_dates")
          .select("booking_date, is_blocked")
          .eq("request_id", request.id)
          .eq("is_blocked", true)
          .order("booking_date", { ascending: false });
        
        if (dates && dates.length > 0) {
          bookingDates = dates;
        }
      }
    }
    
    // Method 3: If still no dates, try to find booking dates directly by item_id and user's requests
    if (bookingDates.length === 0) {
      const { data: requests } = await serviceClient
        .from("requests")
        .select("id")
        .eq("item_id", finalOrder.item_id)
        .eq("requester_id", user.id)
        .in("status", ["approved", "completed"]);

      if (requests && requests.length > 0) {
        const requestIds = requests.map((r: any) => r.id);
        const { data: dates } = await serviceClient
          .from("booking_dates")
          .select("booking_date, is_blocked")
          .in("request_id", requestIds)
          .eq("is_blocked", true)
          .order("booking_date", { ascending: false });
        
        if (dates && dates.length > 0) {
          bookingDates = dates;
        }
      }
    }
  }

  if (hasError || !finalOrder) {
    console.error("Order fetch error:", orderError, "Order ID:", id, "User ID:", user.id);
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p>Order not found</p>
            <Link href="/dashboard">
              <Button className="mt-4">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading screen if payment_id is present and order is still pending
  const showLoading = resolvedSearchParams.payment_id && finalOrder?.status === "pending";

  // Check if this is a service order and if today is the last day
  const isServiceOrder = !!finalOrder?.service_request_id;
  const canMarkAsCompleted = (() => {
    if (!isServiceOrder || !finalOrder?.service_requests?.service_request_dates) {
      return false;
    }

    const serviceStatus = finalOrder.service_requests.status;
    if (serviceStatus === "completed" || serviceStatus === "cancelled") {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const serviceDates = finalOrder.service_requests.service_request_dates
      .map((d: any) => new Date(d.service_date))
      .filter((d: Date) => !isNaN(d.getTime()))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime());

    if (serviceDates.length === 0) {
      return false;
    }

    const lastDate = new Date(serviceDates[0]);
    lastDate.setHours(0, 0, 0, 0);

    // Can mark as completed only on the last day (not after)
    return today.getTime() === lastDate.getTime();
  })();

  // Check if user is the owner (for item orders)
  const isOwner = !isServiceOrder && finalOrder?.items?.user_id === user.id;

  // Check if item can be returned (for item orders only)
  const canReturnItem = (() => {
    if (isServiceOrder || !finalOrder?.item_id || !finalOrder?.items) {
      return false;
    }

    // Only borrower can return
    if (isOwner) {
      return false;
    }

    // Order must be completed
    if (finalOrder.status !== "completed") {
      return false;
    }

    // Return must not already be approved
    if (finalOrder.return_status === "approved") {
      return false;
    }

    // Return must not already be pending
    if (finalOrder.return_status === "pending") {
      return false;
    }

    // Check if today is the last booking date
    if (!bookingDates || bookingDates.length === 0) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = bookingDates
      .map((d: any) => new Date(d.booking_date))
      .filter((d: Date) => !isNaN(d.getTime()))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime());

    if (dates.length === 0) {
      return false;
    }

    const lastDate = new Date(dates[0]);
    lastDate.setHours(0, 0, 0, 0);

    // Can return only on the last day (not after)
    return today.getTime() === lastDate.getTime();
  })();

  // Check if owner can report damage (after return is approved)
  const canReportDamage = isOwner && 
    !isServiceOrder && 
    finalOrder?.return_status === "approved" && 
    !finalOrder?.damage_reported;

  return (
    <>
      {showLoading && <PaymentLoading orderId={finalOrder.id} />}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>Order ID: {finalOrder.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">
                {isServiceOrder ? "Service" : "Item"}
              </h3>
              <p>
                {isServiceOrder 
                  ? finalOrder.service_requests?.service_name 
                  : finalOrder.items?.title}
              </p>
              <p className="text-sm text-gray-600">
                {isServiceOrder 
                  ? finalOrder.service_requests?.description || finalOrder.items?.description
                  : finalOrder.items?.description}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Amount</h3>
              <p className="text-2xl font-bold">₹{finalOrder.amount}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Status</h3>
              <p
                className={`font-semibold ${
                  finalOrder.status === "completed"
                    ? "text-green-600"
                    : finalOrder.status === "failed"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                {finalOrder.status.toUpperCase()}
              </p>
            </div>

            {resolvedSearchParams.payment_id && (
              <div>
                <h3 className="font-semibold mb-2">Payment ID</h3>
                <p className="text-sm font-mono">{resolvedSearchParams.payment_id}</p>
              </div>
            )}

            {finalOrder.razorpay_order_id && (
              <div>
                <h3 className="font-semibold mb-2">Razorpay Order ID</h3>
                <p className="text-sm font-mono">{finalOrder.razorpay_order_id}</p>
              </div>
            )}

            <div className="pt-4 space-y-2">
              {/* Return Item Button for Item Orders */}
              {canReturnItem && (
                <ReturnItemButton
                  orderId={finalOrder.id}
                />
              )}

              {/* Return Status Display */}
              {finalOrder.return_status === "pending" && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Return request pending. Waiting for owner approval.
                  </p>
                </div>
              )}

              {finalOrder.return_status === "approved" && (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ Return approved. Security deposit has been refunded to your wallet.
                    </p>
                  </div>
                  
                  {/* Owner can report damage after return is approved */}
                  {isOwner && !finalOrder.damage_reported && (
                    <ReportDamageButton
                      orderId={finalOrder.id}
                      itemTitle={finalOrder.items?.title || "Item"}
                    />
                  )}

                  {/* Show damage report if already reported */}
                  {finalOrder.damage_reported && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-semibold text-red-800 mb-1">
                        ⚠️ Damage Reported
                      </p>
                      {finalOrder.damage_description && (
                        <p className="text-sm text-red-700">
                          {finalOrder.damage_description}
                        </p>
                      )}
                      {finalOrder.damage_reported_at && (
                        <p className="text-xs text-red-600 mt-1">
                          Reported on: {new Date(finalOrder.damage_reported_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mark as Completed Button for Service Orders */}
              {canMarkAsCompleted && (
                <MarkServiceCompletedButton orderId={finalOrder.id} />
              )}
              <div className="flex gap-2">
                <Link href="/orders" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Back to Orders
                  </Button>
                </Link>
                <Link href="/dashboard" className="flex-1">
                  <Button className="w-full">Back to Dashboard</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

