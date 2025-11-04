import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Package, Clock, TrendingUp, Shield, Plus, Eye, FileEdit, ExternalLink, ArrowUpRight, Tag, HeartHandshake, AlertCircle, Users, IndianRupee } from "lucide-react";
import Image from "next/image";

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

export default async function DashboardPage() {
  await headers();
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // Get or create user in database
  const { user, error: userError } = await getOrCreateUser(userId);

  if (!user) {
    redirect("/sign-in");
  }

  // Get user's items
  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", user?.id || "")
    .order("created_at", { ascending: false });

  // Get available marketplace items (excluding user's own items)
  const serviceClient = createServiceRoleClient();

  // Get user's service requests
  const { data: myServices } = await serviceClient
    .from("service_requests")
    .select(`
      *,
      service_request_dates(service_date),
      service_offers(id, status, provider_id)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);
  
  const { data: marketplaceItems } = await serviceClient
    .from("items")
    .select("*")
    .eq("status", "available")
    .neq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  // Get pending requests received
  const { data: myItems } = await serviceClient
    .from("items")
    .select("id")
    .eq("user_id", user.id);

  const itemIds = myItems?.map((item) => item.id) || [];
  const { data: pendingRequests } = itemIds.length > 0
    ? await serviceClient
        .from("requests")
        .select("id")
        .in("item_id", itemIds)
        .eq("status", "pending")
    : { data: [] };

  // Get user's wallet balance (this is the total income/earnings)
  const walletBalance = parseFloat(user.balance?.toString() || "0");

  // Fetch urgent and open service requests
  const { data: serviceRequests } = await serviceClient
    .from("service_requests")
    .select(`
      *,
      users!service_requests_user_id_fkey(id, name, verified),
      service_request_dates(service_date),
      service_offers(id, status)
    `)
    .in("status", ["open", "in_progress"])
    .order("is_urgent", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  // Filter and sort service requests
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredServices = (serviceRequests || []).filter((service: any) => {
    // Filter out if enough people are accepted
    const peopleNeeded = service.people_needed || 1;
    const acceptedCount = service.service_offers?.filter((offer: any) => offer.status === "accepted").length || 0;
    if (acceptedCount >= peopleNeeded) {
      return false;
    }

    // Filter out if dates have passed
    if (service.service_request_dates && service.service_request_dates.length > 0) {
      const dates = service.service_request_dates
        .map((d: any) => new Date(d.service_date))
        .filter((d: Date) => !isNaN(d.getTime()));
      
      if (dates.length > 0) {
        const lastDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
        lastDate.setHours(0, 0, 0, 0);
        if (lastDate < today) {
          return false;
        }
      }
    }
    return true;
  });

  // Sort: urgent first
  const sortedServices = filteredServices.sort((a: any, b: any) => {
    if (a.is_urgent && !b.is_urgent) return -1;
    if (!a.is_urgent && b.is_urgent) return 1;
    return 0;
  }).slice(0, 3); // Limit to 3 services

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .animate-slide-in-right {
          animation: slideInRight 0.6s ease-out forwards;
        }
      `}} />
      
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="container mx-auto px-8 py-8 max-w-[1400px]">
          {/* Header */}
          <div className="mb-8 opacity-0 animate-fade-in-up">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-500">
              Plan, prioritize, and manage your community.
            </p>
          </div>

          <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-1">
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-5 mb-8">
                {/* My Items - Primary Green */}
                <div className="opacity-0" style={{ animation: 'fadeInUp 0.6s ease-out 0.1s forwards' }}>
                  <Card className="bg-gradient-to-br from-[#1a5f3f] to-[#2d7a55] border-0 text-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden rounded-2xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                          <Package className="w-5 h-5" />
                        </div>
                        <ArrowUpRight className="w-5 h-5 opacity-60" />
                      </div>
                      <div className="text-5xl font-bold mb-2">{items?.length || 0}</div>
                      <div className="text-white/90 text-sm font-medium">My Items</div>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex items-center gap-1 text-xs text-white/70">
                          <TrendingUp className="w-3 h-3" />
                          <span>Increased from last month</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Pending Requests */}
                <div className="opacity-0" style={{ animation: 'fadeInUp 0.6s ease-out 0.2s forwards' }}>
                  <Link href="/dashboard/requests">
                    <Card className={`border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl cursor-pointer ${
                      pendingRequests && pendingRequests.length > 0 
                        ? 'bg-gradient-to-br from-amber-50 to-orange-50 ring-2 ring-amber-200' 
                        : 'bg-white'
                    }`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            pendingRequests && pendingRequests.length > 0
                              ? 'bg-amber-100'
                              : 'bg-gray-50'
                          }`}>
                            <Clock className={`w-5 h-5 ${
                              pendingRequests && pendingRequests.length > 0
                                ? 'text-amber-700'
                                : 'text-gray-700'
                            }`} />
                          </div>
                          <ArrowUpRight className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="text-5xl font-bold text-gray-900 mb-2">{pendingRequests?.length || 0}</div>
                        <div className="text-gray-600 text-sm font-medium">Pending Requests</div>
                        {pendingRequests && pendingRequests.length > 0 ? (
                          <div className="text-amber-600 text-xs mt-3 font-medium">
                            View Requests →
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs mt-3">Requests waiting for you</div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </div>

                {/* Income */}
                <div className="opacity-0" style={{ animation: 'fadeInUp 0.6s ease-out 0.3s forwards' }}>
                  <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 break-words leading-tight min-w-0">
                        ₹{Math.round(walletBalance).toLocaleString('en-IN')}
                      </div>
                      <div className="text-gray-600 text-sm font-medium">Wallet Balance</div>
                      <div className="text-gray-400 text-xs mt-3">Available for services & payments</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Verified Status */}
                <div className="opacity-0" style={{ animation: 'fadeInUp 0.6s ease-out 0.4s forwards' }}>
                  <Link href="/dashboard/verify">
                    <Card className={`border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl cursor-pointer ${
                      user?.verified
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200' 
                        : 'bg-white'
                    }`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            user?.verified
                              ? 'bg-green-100'
                              : 'bg-gray-50'
                          }`}>
                            <Shield className={`w-5 h-5 ${
                              user?.verified
                                ? 'text-green-600'
                                : 'text-gray-700'
                            }`} />
                          </div>
                          <ArrowUpRight className="w-5 h-5 text-gray-400" />
                        </div>
                        {user?.verified ? (
                          <>
                            <div className="text-5xl font-bold text-green-600 mb-2">✓</div>
                            <div className="text-gray-700 text-sm font-medium">Verified</div>
                            <div className="text-gray-500 text-xs mt-3">Phone number verified</div>
                          </>
                        ) : (
                          <>
                            <div className="text-5xl font-bold text-gray-900 mb-2">✗</div>
                            <div className="text-gray-600 text-sm font-medium">Not Verified</div>
                            <div className="text-gray-400 text-xs mt-3">Verify your phone number</div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </div>

              {/* My Items */}
              <div className="opacity-0" style={{ animation: 'fadeInUp 0.6s ease-out 0.5s forwards' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-gray-900">My Items</h2>
                  <div className="flex items-center gap-2">
                    <Link href="/items/manage">
                      <Button variant="ghost" className="text-sm text-gray-600 hover:text-gray-900">
                        <FileEdit className="w-4 h-4 mr-1" />
                        Manage
                      </Button>
                    </Link>
                    <Link href="/items/new">
                      <Button variant="ghost" className="text-sm text-gray-600 hover:text-gray-900">
                        <Plus className="w-4 h-4 mr-1" />
                        Add New
                      </Button>
                    </Link>
                  </div>
                </div>
                
                {!items || items.length === 0 ? (
                  <Card className="bg-white border-0 shadow-sm rounded-2xl">
                    <CardContent className="p-12 text-center">
                      <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No items yet</h3>
                      <p className="text-sm text-gray-500 mb-4">Start sharing items with your community!</p>
                      <Link href="/items/new">
                        <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white rounded-xl">
                          <Plus className="w-4 h-4 mr-2" />
                          Share an Item
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 gap-5">
                    {items.map((item, index) => {
                      const coordinates = extractCoordinates(item.location);
                      const cleanAddress = getCleanAddress(item.location);
                      const googleMapsUrl = coordinates 
                        ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`
                        : null;

                      return (
                        <div key={item.id} className="opacity-0" style={{ animation: `fadeInUp 0.6s ease-out ${0.6 + (index * 0.1)}s forwards` }}>
                          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden">
                            {/* Image */}
                            {item.images && item.images.length > 0 ? (
                              <div className="relative h-32 w-full">
                                <Image
                                  src={item.images[0]}
                                  alt={item.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="relative h-32 w-full bg-gradient-to-br from-slate-200 via-gray-200 to-slate-300 flex items-center justify-center">
                                <Tag className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                            <CardHeader className="pb-2 pt-3">
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-base font-bold text-gray-900">{item.title}</CardTitle>
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                                  item.status === 'available' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                              <div className="mt-1.5 flex items-start gap-1.5 text-gray-500">
                                <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5 text-emerald-600" />
                                <span className="text-xs">{cleanAddress}</span>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="text-xs text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-xl font-bold text-gray-900">
                                  {item.type === "free" ? (
                                    <span className="text-emerald-600">Free</span>
                                  ) : (
                                    `₹${Math.round(parseFloat(item.amount?.toString() || "0"))}`
                                  )}
                                </span>
                                <Link href={`/items/${item.id}`}>
                                  <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white rounded-xl h-8 px-3 text-xs">
                                    View
                                  </Button>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* My Services */}
              <div className="opacity-0 mt-8" style={{ animation: 'fadeInUp 0.6s ease-out 0.7s forwards' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-[#1a5f3f]" />
                    My Services
                  </h2>
                  <div className="flex items-center gap-2">
                    <Link href="/dashboard/my-services">
                      <Button variant="ghost" className="text-sm text-gray-600 hover:text-gray-900">
                        <FileEdit className="w-4 h-4 mr-1" />
                        Manage
                      </Button>
                    </Link>
                    <Link href="/items/new">
                      <Button variant="ghost" className="text-sm text-gray-600 hover:text-gray-900">
                        <Plus className="w-4 h-4 mr-1" />
                        Add New
                      </Button>
                    </Link>
                  </div>
                </div>
                
                {!myServices || myServices.length === 0 ? (
                  <Card className="bg-white border-0 shadow-sm rounded-2xl">
                    <CardContent className="p-12 text-center">
                      <HeartHandshake className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No services yet</h3>
                      <p className="text-sm text-gray-500 mb-4">Create a service request to get help from volunteers!</p>
                      <Link href="/items/new">
                        <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white rounded-xl">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Service Request
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 gap-5">
                    {myServices.map((service: any, index: number) => {
                      const acceptedCount = service.service_offers?.filter((offer: any) => offer.status === "accepted").length || 0;
                      const peopleNeeded = service.people_needed || 1;
                      const cleanAddress = getCleanAddress(service.location || "");

                      return (
                        <div key={service.id} className="opacity-0" style={{ animation: `fadeInUp 0.6s ease-out ${0.8 + (index * 0.1)}s forwards` }}>
                          <Card className={`bg-white border-0 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden ${
                            service.is_urgent ? 'ring-2 ring-red-200' : ''
                          }`}>
                            <CardHeader className="pb-2 pt-3">
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-base font-bold text-gray-900">{service.service_name}</CardTitle>
                                <div className="flex items-center gap-1">
                                  {service.is_urgent && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Urgent
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                                    service.status === 'open' 
                                      ? 'bg-blue-100 text-blue-700'
                                      : service.status === 'in_progress'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : service.status === 'completed'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {service.status}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-1.5 flex items-start gap-1.5 text-gray-500">
                                <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5 text-emerald-600" />
                                <span className="text-xs">{cleanAddress}</span>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="text-xs text-gray-600 mb-3 line-clamp-2">{service.description}</p>
                              <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <span>{acceptedCount}/{peopleNeeded}</span>
                                </div>
                                {service.type === "paid" && service.amount && (
                                  <div className="flex items-center gap-1">
                                    <IndianRupee className="w-3 h-3" />
                                    <span>₹{Math.round(parseFloat(service.amount?.toString() || "0"))}</span>
                                  </div>
                                )}
                                {service.type === "free" && (
                                  <span className="text-emerald-600 font-medium">Free</span>
                                )}
                              </div>
                              <div className="flex justify-between items-center">
                                <Link href={`/services/${service.id}`}>
                                  <Button variant="outline" className="rounded-xl h-8 px-3 text-xs border-gray-300 hover:border-[#1a5f3f] hover:text-[#1a5f3f]">
                                    View Details
                                  </Button>
                                </Link>
                                <Link href="/dashboard/my-services">
                                  <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white rounded-xl h-8 px-3 text-xs">
                                    Manage
                                  </Button>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-80 space-y-6 opacity-0" style={{ animation: 'slideInRight 0.6s ease-out 0.3s forwards' }}>
              {/* Quick Actions */}
              <Card className="bg-white border-0 shadow-sm rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-gray-900">Quick Actions</CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/items/new" className="block">
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Plus className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Share an Item</div>
                          <div className="text-xs text-gray-500">Add new item</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                  
                  <Link href="/marketplace" className="block">
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                          <Eye className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Browse Items</div>
                          <div className="text-xs text-gray-500">Explore marketplace</div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <Link href="/dashboard/requests" className="block">
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                          <Clock className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">View Requests</div>
                          <div className="text-xs text-gray-500">Manage requests</div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <Link href="/dashboard/my-services" className="block">
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                          <HeartHandshake className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">My Services</div>
                          <div className="text-xs text-gray-500">Manage services</div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <Link href="/profile" className="block">
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                          <FileEdit className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Edit Profile</div>
                          <div className="text-xs text-gray-500">Update details</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>

              {/* Urgent & Open Services */}
              <Card className="bg-white border-0 shadow-sm rounded-2xl mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <HeartHandshake className="w-5 h-5 text-[#1a5f3f]" />
                      Urgent & Open Services
                    </CardTitle>
                    <Link href="/marketplace?tab=services">
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-600 hover:text-gray-900">
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sortedServices.length === 0 ? (
                    <div className="text-center py-6">
                      <HeartHandshake className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No urgent services available</p>
                    </div>
                  ) : (
                    sortedServices.map((service: any) => {
                      const peopleNeeded = service.people_needed || 1;
                      const acceptedCount = service.service_offers?.filter((offer: any) => offer.status === "accepted").length || 0;
                      const hasEnoughPeople = acceptedCount >= peopleNeeded;
                      const cleanAddress = getCleanAddress(service.location || "");

                      return (
                        <Link key={service.id} href={`/services/${service.id}`} className="block">
                          <div className={`p-3 rounded-xl transition-colors cursor-pointer ${
                            service.is_urgent
                              ? 'bg-red-50 hover:bg-red-100 border border-red-200'
                              : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
                          }`}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">
                                    {service.service_name}
                                  </h4>
                                  {service.is_urgent && (
                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold flex-shrink-0">
                                      Urgent
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-1 mb-1">
                                  {service.description}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    <span>{acceptedCount}/{peopleNeeded}</span>
                                  </div>
                                  {cleanAddress && (
                                    <div className="flex items-center gap-1 truncate">
                                      <MapPin className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{cleanAddress}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                {service.type === "free" ? (
                                  <span className="text-xs font-semibold text-emerald-600">Free</span>
                                ) : (
                                  <span className="text-xs font-semibold text-gray-900">₹{Math.round(parseFloat(service.amount?.toString() || "0"))}</span>
                                )}
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  hasEnoughPeople
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {hasEnoughPeople ? 'Full' : 'Open'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                  {sortedServices.length > 0 && (
                    <Link href="/marketplace?tab=services" className="block pt-2">
                      <Button variant="outline" className="w-full text-sm" size="sm">
                        View All Services
                        <ArrowUpRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              {/* Additional Marketplace Items */}
              {marketplaceItems && marketplaceItems.length > 4 && (
                <Card className="bg-white border-0 shadow-sm rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-gray-900">More Items</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {marketplaceItems.slice(4, 6).map((item) => {
                      const coordinates = extractCoordinates(item.location);
                      const cleanAddress = getCleanAddress(item.location);

                      return (
                        <Link href={`/items/${item.id}`} key={item.id}>
                          <div className="p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                            {/* Image thumbnail */}
                            {item.images && item.images.length > 0 ? (
                              <div className="relative h-32 w-full mb-2 rounded-lg overflow-hidden">
                                <Image
                                  src={item.images[0]}
                                  alt={item.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="relative h-32 w-full mb-2 rounded-lg bg-gradient-to-br from-slate-200 via-gray-200 to-slate-300 flex items-center justify-center">
                                <Tag className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-900 line-clamp-1">{item.title}</span>
                              <span className="text-xs font-bold text-emerald-600">
                                {item.type === "free" ? "Free" : `₹${Math.round(parseFloat(item.amount?.toString() || "0"))}`}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                            <div className="flex items-center gap-1 mt-2">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-400 line-clamp-1">{cleanAddress}</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}