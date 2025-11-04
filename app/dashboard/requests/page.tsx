import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequestActions } from "@/components/request-actions";
import { PayRequestButton } from "@/components/pay-request-button";
import { ServiceOfferActions } from "@/components/service-offer-actions";
import { ApproveReturnButton } from "@/components/approve-return-button";
import { RejectReturnButton } from "@/components/reject-return-button";
import { ReportDamageButton } from "@/components/report-damage-button";
import Link from "next/link";
import { HeartHandshake, User, CheckCircle2, Package } from "lucide-react";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await headers();
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const type = params.type || "received"; // 'sent' or 'received'

  const supabase = await createClient();
  const { user } = await getOrCreateUser(userId);

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch requests - use service role to bypass RLS since Clerk auth doesn't work with Supabase RLS
  const { createServiceRoleClient } = await import("@/lib/supabase/service");
  const serviceClient = createServiceRoleClient();

  let requests: any[] = [];

  if (type === "sent") {
    // Requests I've sent - also fetch linked orders and booking dates
    const { data, error } = await serviceClient
      .from("requests")
      .select("*, items(id, title, description, category, images, location, type, amount, users(name)), orders(id, status), booking_dates(booking_date, is_blocked)")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching sent requests:", error);
    }
    requests = data || [];
  } else {
    // Requests I've received - get my items first
    const { data: myItems } = await serviceClient
      .from("items")
      .select("id")
      .eq("user_id", user.id);

    const itemIds = myItems?.map((item) => item.id) || [];

    if (itemIds.length > 0) {
      const { data, error } = await serviceClient
        .from("requests")
        .select(`
          *,
          items(
            id, title, description, category, images, location, type, amount
          ),
          requester:users!requests_requester_id_fkey(
            id, name, email, trust_score, verified
          ),
          booking_dates(
            booking_date, is_blocked
          )
        `)
        .in("item_id", itemIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching received requests:", error);
      }
      requests = data || [];
    }
  }

  // Get counts for both types
  const receivedCount = type === "received" ? requests.length : 0;
  const sentCount = type === "sent" ? requests.length : 0;

  // Fetch service offers for received service requests
  let serviceOffers: any[] = [];
  if (type === "received") {
    // Get user's service requests
    const { data: myServiceRequests } = await serviceClient
      .from("service_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "open");

    const serviceRequestIds = myServiceRequests?.map((sr: any) => sr.id) || [];

    if (serviceRequestIds.length > 0) {
      const { data: offers, error: offersError } = await serviceClient
        .from("service_offers")
        .select(`
          *,
          service_requests(
            id, service_name, description, location, type, amount, is_urgent, status
          )
        `)
        .in("service_request_id", serviceRequestIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (offersError) {
        console.error("Error fetching service offers:", offersError);
      }

      // Fetch provider details separately if offers exist
      if (offers && offers.length > 0) {
        const providerIds = offers
          .map((offer: any) => offer.provider_id)
          .filter((id: string) => id);
        
        if (providerIds.length > 0) {
          const { data: providers } = await serviceClient
            .from("users")
            .select("id, name, verified, trust_score")
            .in("id", providerIds);
          
          if (providers) {
            serviceOffers = offers.map((offer: any) => ({
              ...offer,
              providers: providers.find((p: any) => p.id === offer.provider_id),
            }));
          } else {
            serviceOffers = offers;
          }
        } else {
          serviceOffers = offers;
        }
      }
    }
  }

  // Ensure serviceOffers is initialized
  if (!serviceOffers) {
    serviceOffers = [];
  }

  // Fetch orders with pending returns for owners
  let pendingReturns: any[] = [];
  // Fetch orders with approved returns (where damage can be reported)
  let approvedReturns: any[] = [];
  
  if (type === "received") {
    const { data: myItems } = await serviceClient
      .from("items")
      .select("id")
      .eq("user_id", user.id);

    const itemIds = myItems?.map((item) => item.id) || [];

    if (itemIds.length > 0) {
      // Fetch pending returns
      const { data: ordersWithReturns, error: ordersError } = await serviceClient
        .from("orders")
        .select(`
          *,
          items(
            id, title, amount
          ),
          users!orders_user_id_fkey(
            id, name
          )
        `)
        .in("item_id", itemIds)
        .eq("return_status", "pending")
        .eq("status", "completed")
        .order("return_requested_at", { ascending: false });

      if (ordersError) {
        console.error("Error fetching pending returns:", ordersError);
      } else {
        pendingReturns = ordersWithReturns || [];
      }

      // Fetch approved returns (where damage can be reported) - only the most recent one
      const { data: approvedReturnsData, error: approvedReturnsError } = await serviceClient
        .from("orders")
        .select(`
          *,
          items(
            id, title, amount
          ),
          users!orders_user_id_fkey(
            id, name
          )
        `)
        .in("item_id", itemIds)
        .eq("return_status", "approved")
        .eq("status", "completed")
        .order("return_approved_at", { ascending: false })
        .limit(1); // Show only the most recent approved return

      if (approvedReturnsError) {
        console.error("Error fetching approved returns:", approvedReturnsError);
      } else {
        approvedReturns = approvedReturnsData || [];
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-bold mb-2">Requests & Service Offers</h1>
        <div className="flex gap-4 mb-4">
          <Link href="/dashboard/requests?type=received">
            <Button variant={type === "received" ? "default" : "outline"}>
              Received {type === "received" && `(${requests.length + serviceOffers.length})`}
            </Button>
          </Link>
          <Link href="/dashboard/requests?type=sent">
            <Button variant={type === "sent" ? "default" : "outline"}>
              Sent {type === "sent" && `(${requests.length})`}
            </Button>
          </Link>
        </div>
      </div>

      {/* Service Offers Section */}
      {type === "received" && serviceOffers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <HeartHandshake className="w-5 h-5 text-[#1a5f3f]" />
            <h2 className="text-xl font-bold text-gray-900">Pending Service Offers</h2>
            <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
              {serviceOffers.length}
            </span>
          </div>
          <div className="space-y-4 mb-8">
            {serviceOffers.map((offer: any) => (
              <Card key={offer.id} className="border-2 border-amber-200 bg-amber-50/50">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <HeartHandshake className="w-5 h-5 text-[#1a5f3f]" />
                        {offer.service_requests?.service_name || "Service Request"}
                        {offer.service_requests?.is_urgent && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            Urgent
                          </span>
                        )}
                      </CardTitle>
                      <div className="text-sm text-gray-500 mt-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="font-medium">
                            {offer.providers?.name || "Anonymous"}
                          </span>
                          {offer.providers?.verified && (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          )}
                          {" wants to help"}
                        </div>
                        <span className="text-sm text-gray-500">
                          {" • "}
                          {new Date(offer.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
                      Pending
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {offer.message && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-amber-200">
                      <p className="text-sm font-medium text-gray-700 mb-1">Message:</p>
                      <p className="text-gray-700 italic">"{offer.message}"</p>
                    </div>
                  )}
                  
                  <div className="mb-4 space-y-2 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium">Service:</span> {offer.service_requests?.service_name}
                    </p>
                    {offer.service_requests?.type === "paid" && offer.service_requests?.amount && (
                      <p className="text-gray-600">
                        <span className="font-medium">Amount:</span> ₹{offer.service_requests.amount}
                      </p>
                    )}
                    {offer.service_requests?.type === "free" && (
                      <p className="text-gray-600">
                        <span className="font-medium">Type:</span> Free (Volunteer)
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-amber-200">
                    <ServiceOfferActions 
                      offerId={offer.id} 
                      serviceName={offer.service_requests?.service_name || "Service Request"}
                    />
                  </div>

                  <Link href={`/services/${offer.service_request_id}`} className="mt-3 inline-block">
                    <Button variant="ghost" size="sm">
                      View Service Request
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending Returns Section */}
      {type === "received" && pendingReturns.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Pending Item Returns</h2>
          </div>
          <div className="space-y-4">
            {pendingReturns.map((order: any) => {
              const baseAmount = parseFloat(order.items?.amount?.toString() || "0");
              const securityDeposit = baseAmount * 0.1;
              
              return (
                <Card key={order.id} className="border-2 border-blue-200">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-blue-600" />
                          {order.items?.title}
                        </CardTitle>
                        <CardDescription>
                          Return requested by {order.users?.name || "borrower"}
                          {" • "}
                          {order.return_requested_at 
                            ? new Date(order.return_requested_at).toLocaleDateString()
                            : new Date(order.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        Return Pending
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        The borrower has requested to return this item. Approve to refund the security deposit.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <ApproveReturnButton
                        orderId={order.id}
                        itemTitle={order.items?.title || "Item"}
                        refundAmount={securityDeposit}
                      />
                      <RejectReturnButton
                        orderId={order.id}
                        itemTitle={order.items?.title || "Item"}
                      />
                    </div>
                    <Link href={`/orders/${order.id}`} className="mt-3 inline-block">
                      <Button variant="ghost" size="sm">
                        View Order Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Approved Returns Section (where damage can be reported) */}
      {type === "received" && approvedReturns.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Approved Returns</h2>
          </div>
          <div className="space-y-4">
            {approvedReturns.map((order: any) => {
              const baseAmount = parseFloat(order.items?.amount?.toString() || "0");
              const securityDeposit = baseAmount * 0.1;
              
              return (
                <Card key={order.id} className="border-2 border-green-200">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-green-600" />
                          {order.items?.title}
                        </CardTitle>
                        <CardDescription>
                          Returned by {order.users?.name || "borrower"}
                          {" • "}
                          {order.return_approved_at 
                            ? new Date(order.return_approved_at).toLocaleDateString()
                            : "Recently"}
                        </CardDescription>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                        Return Approved
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✓ Return approved. Security deposit of ₹{securityDeposit.toFixed(2)} has been refunded.
                      </p>
                    </div>
                    
                    {/* Report Damage Button - only show if not already reported */}
                    {!order.damage_reported && (
                      <div className="mb-4">
                        <ReportDamageButton
                          orderId={order.id}
                          itemTitle={order.items?.title || "Item"}
                        />
                      </div>
                    )}

                    {/* Show damage report if already reported */}
                    {order.damage_reported && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-semibold text-red-800 mb-1">
                          ⚠️ Damage Reported
                        </p>
                        {order.damage_description && (
                          <p className="text-sm text-red-700">
                            {order.damage_description}
                          </p>
                        )}
                        {order.damage_reported_at && (
                          <p className="text-xs text-red-600 mt-1">
                            Reported on: {new Date(order.damage_reported_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    <Link href={`/orders/${order.id}`} className="mt-3 inline-block">
                      <Button variant="ghost" size="sm">
                        View Order Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Item Requests Section */}
      <div className={type === "received" && (serviceOffers.length > 0 || pendingReturns.length > 0) ? "mt-8" : ""}>
        {type === "received" && (serviceOffers.length > 0 || pendingReturns.length > 0) && (
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-gray-900">Item Requests</h2>
          </div>
        )}

      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">
                No {type === "sent" ? "sent" : "received"} requests yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      {type === "sent" ? request.items?.title : request.items?.title}
                    </CardTitle>
                    <CardDescription>
                      {type === "sent"
                        ? `Requested from ${request.items?.users?.name || "owner"}`
                        : `Requested by ${request.requester?.name || "someone"}`}
                      {" • "}
                      {new Date(request.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      request.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : request.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : request.status === "cancelled"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {request.message && (
                  <p className="mb-4 text-gray-700 italic">"{request.message}"</p>
                )}
                
                {/* Booking Dates - Show prominently for pending requests */}
                {request.booking_dates && request.booking_dates.length > 0 && (
                  <div className={`mb-4 p-4 rounded-lg border-2 ${
                    request.status === "pending" && type === "received"
                      ? "bg-amber-50 border-amber-300"
                      : "bg-blue-50 border-blue-200"
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-base font-bold text-gray-900">
                        📅 Requested Booking Dates:
                      </p>
                      {request.status === "pending" && type === "received" && (
                        <span className="px-2 py-1 bg-amber-200 text-amber-900 rounded-full text-xs font-semibold">
                          Review Before Approving
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {request.booking_dates
                        .sort((a: any, b: any) => 
                          new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime()
                        )
                        .map((bd: any) => (
                          <span
                            key={bd.booking_date}
                            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold ${
                              bd.is_blocked
                                ? "bg-green-100 text-green-800 border-2 border-green-400"
                                : request.status === "pending" && type === "received"
                                ? "bg-white text-amber-900 border-2 border-amber-400 shadow-sm"
                                : "bg-blue-100 text-blue-800 border border-blue-300"
                            }`}
                          >
                            <span className="mr-1.5">📆</span>
                            {new Date(bd.booking_date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {bd.is_blocked && (
                              <span className="ml-1.5 text-green-600" title="Confirmed">
                                ✓
                              </span>
                            )}
                          </span>
                        ))}
                    </div>
                    {request.status === "pending" && type === "received" && (
                      <p className="text-sm text-amber-800 font-medium mt-2 p-2 bg-amber-100 rounded border border-amber-300">
                        ⚠️ These dates will be blocked for other users if you approve this request
                      </p>
                    )}
                    {request.status === "approved" && (
                      <p className="text-sm text-green-700 mt-2 font-medium">
                        ✓ These dates are now blocked for this item
                      </p>
                    )}
                  </div>
                )}
                
                {type === "received" && request.status === "pending" && (
                  <div className="mt-4">
                    <RequestActions requestId={request.id} itemTitle={request.items?.title} />
                  </div>
                )}
                {type === "sent" && request.status === "pending" && (
                  <>
                    {request.booking_dates && request.booking_dates.length > 0 && (
                      <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
                        <p className="text-xs text-gray-600">
                          You requested {request.booking_dates.length} date{request.booking_dates.length > 1 ? 's' : ''} - Waiting for owner approval
                        </p>
                      </div>
                    )}
                    <form action={`/api/requests/${request.id}`} method="PATCH">
                      <input type="hidden" name="status" value="cancelled" />
                      <Button type="submit" variant="outline" size="sm">
                        Cancel Request
                      </Button>
                    </form>
                  </>
                )}
                    {type === "sent" && 
                 request.status === "approved" && 
                 request.items?.type === "paid" && 
                 request.items?.amount && 
                 (!request.orders || request.orders.length === 0 || request.orders[0]?.status === "pending") && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-1">
                          ✓ Request Approved - Payment Required
                        </h4>
                        <p className="text-sm text-blue-800 mb-3">
                          Your request has been approved! Please complete the payment of <span className="font-bold">₹{request.items.amount}</span> to proceed.
                        </p>
                        <PayRequestButton 
                          requestId={request.id}
                          itemId={request.items.id}
                          amount={request.items.amount}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <Link href={`/items/${request.items?.id}`}>
                  <Button variant="ghost" size="sm" className="mt-2">
                    View Item
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </div>
    </div>
  );
}

