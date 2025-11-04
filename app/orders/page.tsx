"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronDown, ChevronUp, Package, Calendar, IndianRupee, ExternalLink, HeartHandshake, CheckCircle2, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ReturnItemButton } from "@/components/return-item-button";

interface Order {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  item_id?: string;
  service_request_id?: string;
  service_offer_id?: string;
  return_status?: string | null;
  return_requested_at?: string | null;
  return_approved_at?: string | null;
  items?: {
    id: string;
    title: string;
    description: string;
    category: string;
    images: string[];
    location: string;
    type: string;
    user_id?: string;
    users?: {
      name: string;
    };
  };
  service_requests?: {
    id: string;
    service_name: string;
    description: string;
    location: string;
    type: string;
    amount: number;
    status: string;
    users?: {
      id: string;
      name: string;
    };
    service_request_dates?: Array<{
      service_date: string;
    }>;
  };
  service_offers?: {
    id: string;
    message: string;
    status: string;
  };
  booking_dates?: Array<{
    booking_date: string;
    is_blocked: boolean;
  }>;
}

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

function getCleanAddress(location: string): string {
  if (!location) return "";
  return location.split(" (")[0] || location;
}

function OrderCard({ order, expandedOrderId, onToggle, onRefresh }: { order: Order; expandedOrderId: string | null; onToggle: (id: string) => void; onRefresh: () => void }) {
  const router = useRouter();
  const isServiceOrder = !!order.service_request_id;
  const location = isServiceOrder ? order.service_requests?.location : order.items?.location;
  const coordinates = extractCoordinates(location || "");
  const cleanAddress = getCleanAddress(location || "");
  const googleMapsUrl = coordinates 
    ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`
    : null;
  
  const isExpanded = expandedOrderId === order.id;
  const [isCompleting, setIsCompleting] = useState(false);

  // Check if today is the last day of the service
  const canMarkAsCompleted = (() => {
    if (!isServiceOrder || !order.service_requests?.service_request_dates) {
      return false;
    }

    const serviceStatus = order.service_requests.status;
    if (serviceStatus === "completed" || serviceStatus === "cancelled") {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const serviceDates = order.service_requests.service_request_dates
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

  // Check if item can be returned (for item orders only)
  const canReturnItem = (() => {
    if (isServiceOrder || !order.item_id || !order.items) {
      return false;
    }

    // Order must be completed
    if (order.status !== "completed") {
      return false;
    }

    // Return must not already be approved
    if (order.return_status === "approved") {
      return false;
    }

    // Return must not already be pending
    if (order.return_status === "pending") {
      return false;
    }

    // Check if today is the last booking date
    if (!order.booking_dates || order.booking_dates.length === 0) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookingDates = order.booking_dates
      .map((d: any) => new Date(d.booking_date))
      .filter((d: Date) => !isNaN(d.getTime()))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime());

    if (bookingDates.length === 0) {
      return false;
    }

    const lastDate = new Date(bookingDates[0]);
    lastDate.setHours(0, 0, 0, 0);

    // Can return only on the last day (not after)
    return today.getTime() === lastDate.getTime();
  })();

  const handleMarkAsCompleted = async () => {
    if (!confirm("Are you sure you want to mark this service as completed?")) {
      return;
    }

    setIsCompleting(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/complete-service`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        alert("Service marked as completed successfully!");
        onRefresh();
        router.refresh();
      } else {
        alert(data.error || "Failed to mark service as completed");
      }
    } catch (error: any) {
      alert("An error occurred. Please try again.");
      console.error("Error marking service as completed:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {isServiceOrder ? (
                <div className="w-16 h-16 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <HeartHandshake className="w-8 h-8 text-emerald-600" />
                </div>
              ) : order.items?.images && order.items.images.length > 0 ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={order.items.images[0]}
                    alt={order.items.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg mb-1 line-clamp-1">
                  {isServiceOrder ? order.service_requests?.service_name : order.items?.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  {new Date(order.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {isServiceOrder && (
                    <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                      Service
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                order.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : order.status === "failed"
                  ? "bg-red-100 text-red-800"
                  : order.status === "refunded"
                  ? "bg-gray-100 text-gray-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {order.status.toUpperCase()}
            </span>
            <div className="flex items-center gap-1 text-xl font-bold text-gray-900">
              <IndianRupee className="w-5 h-5" />
              {order.amount.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2">
            {isServiceOrder ? order.service_requests?.description : order.items?.description}
          </p>
          
          {/* Toggle Button */}
          <button
            onClick={() => onToggle(order.id)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>View Location Details</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {/* Expanded Location Details */}
          {isExpanded && (
            <div className="mt-2 p-4 bg-emerald-50 rounded-lg border border-emerald-200 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div>
                <p className="text-sm font-semibold text-emerald-900 mb-1">Pickup Location:</p>
                <p className="text-sm text-emerald-800">{cleanAddress}</p>
              </div>
              
              {coordinates && (
                <>
                  <div className="pt-2 border-t border-emerald-200">
                    <p className="text-xs text-emerald-700 mb-2">Coordinates:</p>
                    <div className="flex items-center gap-2 text-xs text-emerald-800 font-mono bg-white/50 p-2 rounded">
                      <span>Lat: {coordinates.lat.toFixed(6)}</span>
                      <span>•</span>
                      <span>Lng: {coordinates.lng.toFixed(6)}</span>
                    </div>
                  </div>
                  
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in Google Maps
                    </a>
                  )}
                </>
              )}
              
              {!coordinates && (
                <p className="text-xs text-emerald-600 italic">Coordinates not available</p>
              )}
            </div>
          )}

          {/* Order Info */}
          <div className="pt-3 border-t flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Ordered on {new Date(order.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {order.razorpay_payment_id && (
              <span className="font-mono text-xs">Payment: {order.razorpay_payment_id.slice(-8)}</span>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2">
            <div className="flex gap-2">
              {isServiceOrder ? (
                <Link href={`/services/${order.service_request_id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    View Service
                  </Button>
                </Link>
              ) : (
                <Link href={`/items/${order.items?.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    View Item
                  </Button>
                </Link>
              )}
              <Link href={`/orders/${order.id}`} className="flex-1">
                <Button size="sm" className="w-full bg-[#1a5f3f] hover:bg-[#2d7a55] text-white">
                  View Details
                </Button>
              </Link>
            </div>
            
            {/* Return Item Button for Item Orders */}
            {canReturnItem && (
              <ReturnItemButton
                orderId={order.id}
                onSuccess={onRefresh}
              />
            )}

            {/* Return Status Display */}
            {order.return_status === "pending" && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  Return request pending. Waiting for owner approval.
                </p>
              </div>
            )}

            {order.return_status === "approved" && (
              <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-800">
                  ✓ Return approved. Security deposit has been refunded to your wallet.
                </p>
              </div>
            )}

            {/* Mark as Completed Button for Service Orders */}
            {canMarkAsCompleted && (
              <Button
                onClick={handleMarkAsCompleted}
                disabled={isCompleting}
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Service as Completed
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrdersPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/orders");
      
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
      return;
    }

    if (isLoaded && isSignedIn) {
      fetchOrders();
    }
  }, [isSignedIn, isLoaded, router, fetchOrders]);

  const toggleOrder = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-[#1a5f3f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          </div>
          <p className="text-gray-500 animate-pulse">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchOrders} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl animate-fade-in">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-bold mb-2">My Orders</h1>
        <p className="text-gray-500">
          View all your recent orders and pickup locations
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              You haven't placed any orders yet. Start browsing the marketplace!
            </p>
            <Link href="/marketplace">
              <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white">
                Browse Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              expandedOrderId={expandedOrderId}
              onToggle={toggleOrder}
              onRefresh={fetchOrders}
            />
          ))}
        </div>
      )}
    </div>
  );
}

