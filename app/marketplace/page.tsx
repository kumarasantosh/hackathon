import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Tag, CheckCircle2, HeartHandshake, AlertCircle, Package } from "lucide-react";
import { getOrCreateUser } from "@/lib/user-helpers";
import { MarketplaceSearchFilter } from "@/components/marketplace-search-filter";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; location?: string; tab?: string; category?: string }>;
}) {
  await headers();
  const params = await searchParams;
  const activeTab = params.tab || "products"; // 'products' or 'services'
  const selectedCategory = params.category || "all";
  const { userId } = await auth();
  
  // Use service role client to bypass RLS and see all items
  const serviceClient = createServiceRoleClient();

  // Get current user to identify their own items and items they've rented
  let currentUserId = null;
  let rentedItemIds: string[] = [];
  if (userId) {
    const { user } = await getOrCreateUser(userId);
    currentUserId = user?.id || null;

    // Get items the user has successfully rented (completed requests or orders)
    if (currentUserId) {
      try {
        // Get completed requests (for free items)
        const { data: completedRequests } = await serviceClient
          .from("requests")
          .select("item_id")
          .eq("requester_id", currentUserId)
          .eq("status", "completed");

        // Get completed orders (for paid items)
        const { data: completedOrders } = await serviceClient
          .from("orders")
          .select("item_id")
          .eq("user_id", currentUserId)
          .eq("status", "completed");

        rentedItemIds = [
          ...(completedRequests?.map((r: any) => r.item_id) || []),
          ...(completedOrders?.map((o: any) => o.item_id) || [])
        ];
      } catch (error) {
        console.error("Error fetching rented items:", error);
        // Continue without rented items info
      }
    }
  }

  let items: any[] = [];

  // Build query for items
  let query = serviceClient
    .from("items")
    .select("*, users(name)")
    .order("created_at", { ascending: false });

  // Apply category filter if not "all"
  if (selectedCategory && selectedCategory !== "all") {
    query = query.eq("category", selectedCategory);
  }

  // Get all items
  const { data, error } = await query;

  if (error) {
    console.error("Marketplace error:", error);
    return <div>Error loading marketplace: {error.message}</div>;
  }

  // Filter by search query if provided (case-insensitive text search)
  if (params.q && params.q.trim()) {
    const searchTerm = params.q.toLowerCase().trim();
    const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0); // Split into multiple words
    
    items = (data || []).filter(item => {
      const title = item.title?.toLowerCase() || "";
      const description = item.description?.toLowerCase() || "";
      const category = item.category?.toLowerCase() || "";
      
      // Search across all fields - match if any search term matches any field
      return searchTerms.some(term => 
        title.includes(term) || 
        description.includes(term) || 
        category.includes(term)
      );
    });
  } else {
    items = data || [];
  }

  // Mark items as rented or owned
  items = items.map(item => ({
    ...item,
    isRented: rentedItemIds.includes(item.id),
    isOwned: currentUserId && item.user_id === currentUserId
  }));

  // Fetch service requests
  const { data: serviceRequests, error: serviceError } = await serviceClient
    .from("service_requests")
    .select(`
      *,
      users!service_requests_user_id_fkey(id, name, verified),
      service_request_dates(service_date),
      service_offers(id, status)
    `)
    .in("status", ["open", "in_progress"])
    .order("is_urgent", { ascending: false })
    .order("created_at", { ascending: false });

  if (serviceError) {
    console.error("Error fetching service requests:", serviceError);
  }

  // Filter out service requests where all dates have passed OR enough people are accepted
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const filteredServiceRequests = (serviceRequests || []).filter((service: any) => {
    // Check if enough people are already accepted
    const peopleNeeded = service.people_needed || 1;
    
    // Count accepted offers (if service_offers data is available)
    let acceptedCount = 0;
    if (service.service_offers) {
      acceptedCount = service.service_offers.filter((offer: any) => offer.status === "accepted").length;
    }
    
    // If we have enough people, hide the service request
    if (acceptedCount >= peopleNeeded) {
      return false;
    }
    
    // Check if dates have passed
    if (!service.service_request_dates || service.service_request_dates.length === 0) {
      return true; // No dates, keep it
    }
    
    // Get the latest (last) date from service_request_dates
    const dates = service.service_request_dates
      .map((d: any) => new Date(d.service_date))
      .filter((d: Date) => !isNaN(d.getTime()));
    
    if (dates.length === 0) {
      return true; // No valid dates, keep it
    }
    
    const lastDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
    lastDate.setHours(0, 0, 0, 0);
    
    // Only keep if last date is today or in the future
    return lastDate >= today;
  });

  // Sort: urgent first, then by creation date (newest first)
  const sortedServiceRequests = filteredServiceRequests.sort((a: any, b: any) => {
    // Urgent requests first
    if (a.is_urgent && !b.is_urgent) return -1;
    if (!a.is_urgent && b.is_urgent) return 1;
    
    // Then by creation date (newest first)
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] animate-fade-in">
      <div className="container mx-auto px-8 py-8 max-w-[1400px]">
      <div className="mb-8 animate-fade-in-up">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Marketplace</h1>
          <p className="text-gray-500 mb-6">
          {params.q
            ? `Search results for "${params.q}"`
              : "Discover items and services shared by your neighbors"}
          </p>
          
          {/* Search and Category Filter - Only show for products tab */}
          {activeTab === "products" && <MarketplaceSearchFilter />}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b">
            <Link
              href={(() => {
                const urlParams = new URLSearchParams();
                if (params.q) urlParams.set("q", params.q);
                if (selectedCategory && selectedCategory !== "all") urlParams.set("category", selectedCategory);
                urlParams.set("tab", "products");
                return `/marketplace?${urlParams.toString()}`;
              })()}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "products"
                  ? "border-[#1a5f3f] text-[#1a5f3f]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Package className="w-4 h-4" />
              Products
            </Link>
            <Link
              href={(() => {
                const urlParams = new URLSearchParams();
                if (params.q) urlParams.set("q", params.q);
                if (selectedCategory && selectedCategory !== "all") urlParams.set("category", selectedCategory);
                urlParams.set("tab", "services");
                return `/marketplace?${urlParams.toString()}`;
              })()}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "services"
                  ? "border-[#1a5f3f] text-[#1a5f3f]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <HeartHandshake className="w-4 h-4" />
              Services
            </Link>
          </div>
        </div>

        {/* Service Requests Section */}
        {activeTab === "services" && sortedServiceRequests && sortedServiceRequests.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <HeartHandshake className="w-6 h-6 text-[#1a5f3f]" />
              <h2 className="text-2xl font-bold text-gray-900">Service Requests</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedServiceRequests.map((service: any) => (
                <Card 
                  key={service.id}
                  className={`bg-white border-0 shadow-sm rounded-2xl overflow-hidden transition-all hover:shadow-md ${
                    service.is_urgent ? 'ring-2 ring-red-300 bg-gradient-to-br from-red-50/50 to-orange-50/50' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg font-bold text-gray-900">{service.service_name}</CardTitle>
                      {service.is_urgent && (
                        <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          Urgent
                        </div>
                      )}
                    </div>
                    <CardDescription className="text-gray-500">
                      by {service.users?.name || "Anonymous"}
                      {service.users?.verified && (
                        <CheckCircle2 className="w-3 h-3 inline ml-1 text-green-600" />
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{service.description}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-medium">Location:</span>
                        <span>{service.location?.split(" (")[0] || "Not specified"}</span>
                      </div>
                      {service.service_request_dates && service.service_request_dates.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-medium">Dates:</span>
                          <span>{service.service_request_dates.length} date{service.service_request_dates.length > 1 ? 's' : ''} selected</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-medium">People:</span>
                        <span>
                          {(() => {
                            const peopleNeeded = service.people_needed || 1;
                            const acceptedCount = service.service_offers?.filter((o: any) => o.status === "accepted").length || 0;
                            return `${acceptedCount}/${peopleNeeded}`;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">
                          {service.type === "free" ? (
                            <span className="text-emerald-600">Free (Volunteer)</span>
                          ) : (
                            `₹${service.amount}`
                          )}
                        </span>
                      </div>
                    </div>
                    <Link href={`/services/${service.id}`}>
                      <Button 
                        size="sm" 
                        className="w-full bg-[#1a5f3f] hover:bg-[#2d7a55] text-white"
                      >
                        View Request
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No Services Message */}
        {activeTab === "services" && (!sortedServiceRequests || sortedServiceRequests.length === 0) && (
          <div className="text-center py-12">
            <HeartHandshake className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No service requests available yet.</p>
            <Link href="/items/new">
              <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white">
                Create Service Request
              </Button>
            </Link>
          </div>
        )}

        {/* Items Section */}
        {activeTab === "products" && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Items</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items?.map((item) => {
          const isRented = item.isRented || false;
          const isOwned = item.isOwned || false;
          
          return (
            <Card 
              key={item.id} 
              className={`bg-white border-0 shadow-sm rounded-2xl overflow-hidden transition-all ${
                isRented 
                  ? 'ring-2 ring-[#1a5f3f]/30 bg-gradient-to-br from-[#1a5f3f]/5 to-[#2d7a55]/5 shadow-md' 
                  : isOwned
                  ? 'ring-1 ring-gray-300 bg-gray-50/50'
                  : 'hover:shadow-md'
              }`}
            >
              {item.images && item.images.length > 0 ? (
                <div className="relative h-48 w-full">
                  <Image
                    src={item.images[0]}
                    alt={item.title}
                    fill
                    className={`object-cover ${isRented ? 'opacity-90' : ''}`}
                  />
                  {isRented && (
                    <div className="absolute top-2 right-2 bg-gradient-to-br from-[#1a5f3f] to-[#2d7a55] text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                      <CheckCircle2 className="w-3 h-3" />
                      Previously Rented
                    </div>
                  )}
                  {isOwned && (
                    <div className="absolute top-2 right-2 bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                      Your Item
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative h-48 w-full bg-gradient-to-br from-slate-200 via-gray-200 to-slate-300 flex items-center justify-center">
                  <Tag className="w-12 h-12 text-gray-400" />
                  {isRented && (
                    <div className="absolute top-2 right-2 bg-gradient-to-br from-[#1a5f3f] to-[#2d7a55] text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                      <CheckCircle2 className="w-3 h-3" />
                      Previously Rented
                    </div>
                  )}
                  {isOwned && (
                    <div className="absolute top-2 right-2 bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                      Your Item
                    </div>
                  )}
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-bold text-gray-900">{item.title}</CardTitle>
                  {isRented && (
                    <CheckCircle2 className="w-5 h-5 text-[#1a5f3f] flex-shrink-0 mt-0.5" />
                  )}
                </div>
                <CardDescription className="text-gray-500">
                  {item.category} • {item.location}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {item.type === "free" ? (
                      <span className="text-emerald-600">Free</span>
                    ) : (
                      `₹${item.amount}`
                    )}
                  </span>
                  <Link href={`/items/${item.id}`}>
                    <Button 
                      size="sm" 
                      className={isRented 
                        ? "border-[#1a5f3f] text-[#1a5f3f] hover:bg-[#1a5f3f] hover:text-white" 
                        : "bg-[#1a5f3f] hover:bg-[#2d7a55] text-white"
                      }
                    >
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
            </div>

            {items?.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No items available in the marketplace yet.</p>
                <Link href="/items/new">
                  <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white">
                    Be the first to share!
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

