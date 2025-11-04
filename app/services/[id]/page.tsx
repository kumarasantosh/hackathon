import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, HeartHandshake, MapPin, Calendar, DollarSign, User, ExternalLink, Users } from "lucide-react";
import Link from "next/link";
import { JoinServiceButton } from "@/components/join-service-button";
import { MarkServiceCompletedButton } from "@/components/mark-service-completed-button";

// Helper function to extract coordinates from location string
function extractCoordinates(location: string): { lat: number; lng: number } | null {
  if (!location) return null;
  const coordMatch = location.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/);
  if (coordMatch) {
    return {
      lat: parseFloat(coordMatch[1]),
      lng: parseFloat(coordMatch[2])
    };
  }
  return null;
}

// Helper function to get clean address (without coordinates)
function getCleanAddress(location: string): string {
  if (!location) return "";
  return location.split(" (")[0] || location;
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await headers();
  const { userId } = await auth();
  const { id } = await params;
  
  const serviceClient = createServiceRoleClient();
  
  // Fetch service request with details
  const { data: serviceRequest, error } = await serviceClient
    .from("service_requests")
    .select(`
      *,
      users(id, name, email, verified, trust_score),
      service_request_dates(service_date),
      service_offers(
        id,
        provider_id,
        message,
        status,
        created_at
      )
    `)
    .eq("id", id)
    .single();

  // Fetch provider details separately if there are offers
  if (serviceRequest?.service_offers && serviceRequest.service_offers.length > 0) {
    const providerIds = serviceRequest.service_offers
      .map((offer: any) => offer.provider_id)
      .filter((id: string) => id);
    
    if (providerIds.length > 0) {
      const { data: providers } = await serviceClient
        .from("users")
        .select("id, name, verified")
        .in("id", providerIds);
      
      if (providers) {
        serviceRequest.service_offers = serviceRequest.service_offers.map((offer: any) => ({
          ...offer,
          providers: providers.find((p: any) => p.id === offer.provider_id),
        }));
      }
    }
  }

  if (error || !serviceRequest) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 mb-4">Service request not found</p>
            <Link href="/marketplace?tab=services">
              <Button variant="outline">Back to Services</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if service request is expired
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let isExpired = false;
  if (serviceRequest.service_request_dates && serviceRequest.service_request_dates.length > 0) {
    const dates = serviceRequest.service_request_dates
      .map((d: any) => new Date(d.service_date))
      .filter((d: Date) => !isNaN(d.getTime()));
    
    if (dates.length > 0) {
      const lastDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
      lastDate.setHours(0, 0, 0, 0);
      isExpired = lastDate < today;
    }
  }

  // Get current user info if logged in
  let currentUserId: string | null = null;
  let userOffer: any = null;
  
  if (userId) {
    const { user } = await getOrCreateUser(userId);
    currentUserId = user?.id || null;
    
    // Check if user has already made an offer
    if (currentUserId && serviceRequest.service_offers) {
      userOffer = serviceRequest.service_offers.find(
        (offer: any) => offer.provider_id === currentUserId && offer.status === "pending"
      );
    }
  }

  const isOwner = currentUserId === serviceRequest.user_id;
  const peopleNeeded = serviceRequest.people_needed || 1;
  const acceptedOffers = serviceRequest.service_offers?.filter(
    (offer: any) => offer.status === "accepted"
  ) || [];
  const acceptedCount = acceptedOffers.length;
  const hasEnoughPeople = acceptedCount >= peopleNeeded;

  // Check if service can be marked as completed (only on last date)
  let canMarkAsCompleted = false;
  let orderId: string | null = null;
  
  if (isOwner && serviceRequest.service_request_dates && serviceRequest.service_request_dates.length > 0) {
    if (serviceRequest.status !== "completed" && serviceRequest.status !== "cancelled") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const serviceDates = serviceRequest.service_request_dates
        .map((d: any) => new Date(d.service_date))
        .filter((d: Date) => !isNaN(d.getTime()))
        .sort((a: Date, b: Date) => b.getTime() - a.getTime());

      if (serviceDates.length > 0) {
        const lastDate = new Date(serviceDates[0]);
        lastDate.setHours(0, 0, 0, 0);
        canMarkAsCompleted = today.getTime() === lastDate.getTime();
      }

      // Fetch order ID for this service
      if (canMarkAsCompleted && currentUserId) {
        const { data: order } = await serviceClient
          .from("orders")
          .select("id")
          .eq("service_request_id", serviceRequest.id)
          .eq("user_id", currentUserId)
          .single();
        
        if (order) {
          orderId = order.id;
        }
      }
    }
  }

  // Format dates
  const formattedDates = serviceRequest.service_request_dates
    ?.map((d: any) => {
      const date = new Date(d.service_date);
      return date.toLocaleDateString("en-US", { 
        weekday: "short", 
        year: "numeric", 
        month: "short", 
        day: "numeric" 
      });
    })
    .sort() || [];

  // Extract location coordinates and create Google Maps URL
  const cleanAddress = getCleanAddress(serviceRequest.location || "");
  const coordinates = extractCoordinates(serviceRequest.location || "");
  const googleMapsUrl = coordinates
    ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`
    : null;

  return (
    <div className="min-h-screen bg-[#f8f9fa] animate-fade-in">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Link href="/marketplace?tab=services" className="animate-fade-in-up">
          <Button variant="ghost" className="mb-6">
            ← Back to Services
          </Button>
        </Link>

        {/* Main Card */}
        <Card className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-br from-[#1a5f3f]/5 to-[#2d7a55]/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{serviceRequest.service_name}</h1>
                  {serviceRequest.is_urgent && (
                    <Badge className="bg-red-100 text-red-700 border-red-300 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Urgent
                    </Badge>
                  )}
                  {isExpired && (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600">
                      Expired
                    </Badge>
                  )}
                  {hasEnoughPeople && (
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      {acceptedCount}/{peopleNeeded} People
                    </Badge>
                  )}
                  {!hasEnoughPeople && acceptedCount > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                      {acceptedCount}/{peopleNeeded} People
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-base mt-2">
                  by {serviceRequest.users?.name || "Anonymous"}
                  {serviceRequest.users?.verified && (
                    <CheckCircle2 className="w-4 h-4 inline ml-1 text-green-600" />
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
              <p className="text-gray-700 leading-relaxed">{serviceRequest.description}</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-[#1a5f3f] mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-1">Location</p>
                  <p className="text-gray-900 mb-2">{cleanAddress || "Not specified"}</p>
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1a5f3f] hover:text-[#2d7a55] transition-colors group"
                    >
                      <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      Open in Google Maps
                    </a>
                  )}
                  {coordinates && (
                    <p className="text-xs text-gray-500 mt-2 font-mono">
                      {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>

              {/* Service Type */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-[#1a5f3f] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Service Type</p>
                  <p className="text-gray-900">
                    {serviceRequest.type === "free" ? (
                      <span className="text-emerald-600 font-semibold">Free (Volunteer)</span>
                    ) : (
                      <span className="font-semibold">Paid: ₹{serviceRequest.amount}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* People Needed */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Users className="w-5 h-5 text-[#1a5f3f] mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">People Needed</p>
                  <p className="text-gray-900 font-semibold text-lg">
                    {acceptedCount} / {peopleNeeded} {peopleNeeded === 1 ? 'person' : 'people'}
                  </p>
                  {hasEnoughPeople && (
                    <p className="text-xs text-green-600 mt-1 font-medium">
                      ✓ Enough people found!
                    </p>
                  )}
                  {!hasEnoughPeople && acceptedCount > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      Need {peopleNeeded - acceptedCount} more {peopleNeeded - acceptedCount === 1 ? 'person' : 'people'}
                    </p>
                  )}
                  {acceptedCount === 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Looking for {peopleNeeded} {peopleNeeded === 1 ? 'person' : 'people'}
                    </p>
                  )}
                  {serviceRequest.auto_approve && (
                    <p className="text-xs text-green-600 mt-1 font-medium">
                      ✓ Auto-approve enabled
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Service Dates */}
            {formattedDates.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#1a5f3f]" />
                  Service Dates
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {formattedDates.map((dateStr, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 font-medium"
                    >
                      {dateStr}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Status</h2>
              <Badge
                className={
                  serviceRequest.status === "open"
                    ? "bg-green-100 text-green-700 border-green-300"
                    : serviceRequest.status === "in_progress"
                    ? "bg-blue-100 text-blue-700 border-blue-300"
                    : serviceRequest.status === "completed"
                    ? "bg-gray-100 text-gray-700 border-gray-300"
                    : "bg-red-100 text-red-700 border-red-300"
                }
              >
                {serviceRequest.status.charAt(0).toUpperCase() + serviceRequest.status.slice(1).replace("_", " ")}
              </Badge>
            </div>

            {/* Existing Offers */}
            {serviceRequest.service_offers && serviceRequest.service_offers.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-[#1a5f3f]" />
                  Offers ({serviceRequest.service_offers.length})
                </h2>
                <div className="space-y-3">
                  {serviceRequest.service_offers.map((offer: any) => (
                    <Card
                      key={offer.id}
                      className={`border ${
                        offer.status === "accepted"
                          ? "border-green-300 bg-green-50"
                          : offer.status === "rejected"
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="font-medium text-gray-900">
                                {offer.providers?.name || "Anonymous"}
                              </span>
                              {offer.providers?.verified && (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              )}
                              <Badge
                                variant="outline"
                                className={
                                  offer.status === "accepted"
                                    ? "border-green-300 text-green-700"
                                    : offer.status === "rejected"
                                    ? "border-red-300 text-red-700"
                                    : "border-gray-300"
                                }
                              >
                                {offer.status}
                              </Badge>
                            </div>
                            {offer.message && (
                              <p className="text-sm text-gray-600 mt-1">{offer.message}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(offer.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Join Button */}
            {!isOwner && (serviceRequest.status === "open" || serviceRequest.status === "in_progress") && !isExpired && !hasEnoughPeople && (
              <div className="pt-4 border-t">
                {userId ? (
                  userOffer ? (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <p className="text-blue-800 font-medium mb-2">
                          ✓ You have already submitted an offer
                        </p>
                        <p className="text-sm text-blue-700">
                          Status: {userOffer.status === "pending" ? "Pending review" : userOffer.status}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <JoinServiceButton serviceRequestId={serviceRequest.id} />
                  )
                ) : (
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4">
                      <p className="text-amber-800 font-medium mb-3">
                        Sign in to join this service request
                      </p>
                      <Link href="/sign-in">
                        <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white">
                          Sign In
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Owner Actions */}
            {isOwner && (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <p className="text-gray-700 mb-3">
                      This is your service request. You can manage offers from your dashboard.
                    </p>
                    <div className="flex gap-2">
                      <Link href="/dashboard/my-services" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          Manage Services
                        </Button>
                      </Link>
                      <Link href="/dashboard" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          Go to Dashboard
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Mark as Completed Button */}
                  {canMarkAsCompleted && orderId && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        <p className="text-xs text-blue-800">
                          Today is the last service date. You can mark this service as completed.
                        </p>
                      </div>
                      <MarkServiceCompletedButton orderId={orderId} />
                    </div>
                  )}
                  
                  {serviceRequest.status === "completed" && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <p className="text-xs text-green-800">
                          This service has been completed. Payments have been processed.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

