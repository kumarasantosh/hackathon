import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { RequestItemButton } from "@/components/request-item-button";
import { PayRequestButton } from "@/components/pay-request-button";
import { getOrCreateUser } from "@/lib/user-helpers";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { MapPin, User, Shield, Award, Tag, ArrowLeft } from "lucide-react";
import { ImageGallery } from "@/components/image-gallery";

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

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await headers();
  const supabase = await createClient();
  const { userId } = await auth();

  // First, cleanup past booking dates and update item availability if needed
  const serviceClient = createServiceRoleClient();
  try {
    await serviceClient.rpc('update_item_availability', { p_item_id: id });
  } catch (cleanupError) {
    // Function may not exist yet, continue anyway
    console.log('Cleanup function may not exist yet:', cleanupError);
  }

  // Get item - don't filter by status, allow all items to be viewed
  // Availability is now controlled by booking_dates, not item status
  const { data: item, error } = await serviceClient
    .from("items")
    .select("*, users(name, trust_score, verified)")
    .eq("id", id)
    .single();

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-6 text-center">
            <p className="text-lg text-gray-700 mb-4">Item not found</p>
            <Link href="/marketplace">
              <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white">
                Back to Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if item belongs to current user
  let isOwner = false;
  let approvedRequest = null;
  let existingRequest = null;
  let userVerified = false;
  
  if (userId) {
    const { user } = await getOrCreateUser(userId);
      if (user) {
      isOwner = item.user_id === user.id;
      
      // Pass user verification status for RequestItemButton
      userVerified = user.verified || false;
      
      if (!isOwner) {
        const serviceClient = createServiceRoleClient();
        const { data: requests } = await serviceClient
          .from("requests")
          .select("*")
          .eq("item_id", id)
          .eq("requester_id", user.id)
          .order("created_at", { ascending: false });

        if (requests && requests.length > 0) {
          const latestRequest = requests[0];
          
          if (latestRequest.status === "approved" && item.type === "paid") {
            const { data: orders } = await serviceClient
              .from("orders")
              .select("id, status")
              .eq("request_id", latestRequest.id)
              .eq("user_id", user.id);
            
            const needsPayment = !orders || 
              orders.length === 0 || 
              orders.some((o: any) => o.status === "pending");
            
            if (needsPayment) {
              approvedRequest = latestRequest;
            }
            if (!needsPayment) {
              // Check if booking dates have passed
              const { data: bookingDates } = await serviceClient
                .from("booking_dates")
                .select("booking_date")
                .eq("request_id", latestRequest.id)
                .eq("is_blocked", true);
              
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const allDatesPassed = bookingDates && bookingDates.length > 0
                ? bookingDates.every((bd: any) => {
                    const bookingDate = new Date(bd.booking_date);
                    bookingDate.setHours(0, 0, 0, 0);
                    return bookingDate < today;
                  })
                : false;
              
              // Only show "Request Completed" if dates haven't all passed
              if (!allDatesPassed) {
                existingRequest = latestRequest;
              }
            }
          } else if (latestRequest.status === "pending") {
            existingRequest = latestRequest;
          } else if (latestRequest.status === "completed") {
            // For completed requests, check if all booking dates have passed
            const { data: bookingDates } = await serviceClient
              .from("booking_dates")
              .select("booking_date")
              .eq("request_id", latestRequest.id)
              .eq("is_blocked", true);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const allDatesPassed = bookingDates && bookingDates.length > 0
              ? bookingDates.every((bd: any) => {
                  const bookingDate = new Date(bd.booking_date);
                  bookingDate.setHours(0, 0, 0, 0);
                  return bookingDate < today;
                })
              : true; // If no booking dates, consider it passed
            
            // Only show "Request Completed" if dates haven't all passed
            if (!allDatesPassed) {
              existingRequest = latestRequest;
            }
          }
        }
      }
    }
  }

  const coordinates = extractCoordinates(item.location);
  const cleanAddress = getCleanAddress(item.location);
  const googleMapsUrl = coordinates 
    ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 animate-fade-in">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <Link href="/marketplace" className="inline-block mb-6 animate-fade-in-up">
          <Button variant="ghost" className="gap-2 hover:bg-white/80">
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Image Section */}
          <div className="lg:col-span-3 animate-fade-in-delay-1">
            <ImageGallery images={item.images || []} title={item.title} />
          </div>

          {/* Details Section */}
          <div className="lg:col-span-2 space-y-6 animate-fade-in-delay-2">
            {/* Main Info Card */}
            <Card className="shadow-xl border-0 overflow-hidden">
              <div className="bg-gradient-to-br from-[#1a5f3f] to-[#2d7a55] p-6 text-white">
                <h1 className="text-3xl font-bold mb-4">{item.title}</h1>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                    <Tag className="w-3.5 h-3.5" />
                    {item.category}
                  </span>
                  <span 
                    className={`px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm ${
                      item.status === "available" 
                        ? "bg-green-500/30 text-white" 
                        : "bg-red-500/30 text-white"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="text-5xl font-bold mb-2">
                  {item.type === "free" ? (
                    <span className="text-emerald-300">Free</span>
                  ) : (
                    <span>₹{item.amount}</span>
                  )}
                </div>
                <p className="text-white/80 text-sm mb-3">
                  {item.type === "free" ? "Available at no cost" : "Rental price"}
                </p>
                {item.type === "paid" && item.amount && (
                  <div className="pt-3 border-t border-white/20">
                    <div className="text-lg font-semibold text-white/90 mb-1">
                      Security Deposit (10%)
                    </div>
                    <div className="text-2xl font-bold">
                      ₹{(item.amount * 0.1).toFixed(2)}
                    </div>
                    <div className="text-white/70 text-xs mt-1">
                      Total: ₹{(item.amount * 1.1).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Location */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-700 font-semibold">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    Location
                  </div>
                  <p className="text-gray-600 pl-7">{cleanAddress}</p>
                  {googleMapsUrl && (
                    <a 
                      href={googleMapsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 pl-7 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors group"
                    >
                      <MapPin className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Open in Google Maps
                      <span className="text-xs group-hover:translate-x-1 transition-transform">→</span>
                    </a>
                  )}
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 text-gray-700 font-semibold mb-3">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    Description
                  </div>
                  <p className="text-gray-600 leading-relaxed pl-7">{item.description}</p>
                </div>

                {/* Owner Info */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 text-gray-700 font-semibold mb-3">
                    <User className="w-5 h-5 text-emerald-600" />
                    Shared by
                  </div>
                  <div className="pl-7 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">
                        {item.users?.name || "Anonymous"}
                      </span>
                      {item.users?.verified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1a5f3f] text-white rounded-full text-xs font-medium">
                          <Shield className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>Trust Score: <span className="font-semibold text-gray-900">{item.users?.trust_score || 50}/100</span></span>
                    </div>
                  </div>
                </div>

                {/* Action Section */}
                {/* Note: Items can be requested even if status is "rented" - availability is controlled by booking dates */}
                {userId && !isOwner && (
                  <div className="border-t pt-6">
                    {approvedRequest && item.type === "paid" && item.amount ? (
                      <div className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border-2 border-emerald-200">
                        <div className="flex gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a5f3f] to-[#2d7a55] flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-lg font-bold">✓</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 mb-1">Request Approved!</h4>
                            <p className="text-sm text-gray-600 mb-2">
                              Rental Price: <span className="font-bold text-emerald-600">₹{item.amount}</span>
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                              Security Deposit (10%): <span className="font-bold text-emerald-600">₹{(item.amount * 0.1).toFixed(2)}</span>
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              Total Amount: <span className="font-bold text-emerald-600">₹{(item.amount * 1.1).toFixed(2)}</span>
                            </p>
                          </div>
                        </div>
                        <PayRequestButton 
                          requestId={approvedRequest.id}
                          itemId={item.id}
                          amount={item.amount}
                        />
                      </div>
                    ) : existingRequest ? (
                      <div className="space-y-4">
                        <div className={`p-5 rounded-2xl border-2 ${
                          existingRequest.status === "completed"
                            ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
                            : "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200"
                        }`}>
                          <div className="flex gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              existingRequest.status === "completed"
                                ? "bg-gradient-to-br from-green-600 to-emerald-600"
                                : "bg-gradient-to-br from-amber-500 to-yellow-500"
                            }`}>
                              <span className="text-white text-lg font-bold">
                                {existingRequest.status === "completed" ? "✓" : "⏱"}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-bold mb-1 ${
                                existingRequest.status === "completed" ? "text-green-900" : "text-amber-900"
                              }`}>
                                {existingRequest.status === "completed" ? "Request Completed" : "Request Pending"}
                              </h4>
                              <p className={`text-sm ${
                                existingRequest.status === "completed" ? "text-green-700" : "text-amber-700"
                              }`}>
                                {existingRequest.status === "completed"
                                  ? "This item is now rented to you."
                                  : "Waiting for the owner's response."}
                              </p>
                            </div>
                          </div>
                        </div>
                        {existingRequest.status === "completed" && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-sm text-blue-900 mb-3">
                              <strong>Want to book more dates?</strong> You can request additional dates for this item.
                            </p>
                            <RequestItemButton itemId={item.id} userVerified={userVerified} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <RequestItemButton itemId={item.id} userVerified={userVerified} />
                    )}
                  </div>
                )}
                
                {userId && isOwner && (
                  <div className="border-t pt-6">
                    <Link href="/dashboard">
                      <Button variant="outline" className="w-full h-12 text-base font-medium hover:bg-gray-50">
                        View in Your Items
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}