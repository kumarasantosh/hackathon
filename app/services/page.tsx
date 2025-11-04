import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getOrCreateUser } from "@/lib/user-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, AlertCircle, MapPin, Calendar, DollarSign, Clock } from "lucide-react";

export default async function ServicesPage() {
  await headers();
  const { userId } = await auth();

  const serviceClient = createServiceRoleClient();

  // Get all open service requests
  const { data: serviceRequests } = await serviceClient
    .from("service_requests")
    .select(`
      *,
      users(id, name, trust_score, verified),
      service_request_dates(service_date)
    `)
    .eq("status", "open")
    .order("is_urgent", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#f8f9fa] animate-fade-in">
      <div className="container mx-auto px-8 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between animate-fade-in-up">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Services & Volunteers
            </h1>
            <p className="text-gray-500">
              Find or offer services and volunteer help in your community
            </p>
          </div>
          {userId && (
            <Link href="/services/new">
              <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Request Service
              </Button>
            </Link>
          )}
        </div>

        {/* Service Requests List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceRequests && serviceRequests.length > 0 ? (
            serviceRequests.map((request: any) => {
              const dates = request.service_request_dates?.map((d: any) => d.service_date) || [];
              const requester = request.users;

              return (
                <Card
                  key={request.id}
                  className={`border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl ${
                    request.is_urgent ? "ring-2 ring-red-300 bg-red-50/50" : "bg-white"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg font-bold text-gray-900 flex-1">
                        {request.service_name}
                      </CardTitle>
                      {request.is_urgent && (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                    </div>
                    <CardDescription className="text-gray-500">
                      by {requester?.name || "Anonymous"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {request.description}
                    </p>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">
                          {request.location.split(" (")[0]}
                        </span>
                      </div>

                      {dates.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {dates.length} date{dates.length > 1 ? "s" : ""} selected
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {request.type === "free" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            Free / Volunteer
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            <DollarSign className="w-3 h-3" />
                            ₹{request.amount}
                          </span>
                        )}
                        {request.is_urgent && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            Urgent
                          </span>
                        )}
                      </div>
                    </div>

                    <Link href={`/services/${request.id}`}>
                      <Button
                        variant="outline"
                        className="w-full border-[#1a5f3f] text-[#1a5f3f] hover:bg-[#1a5f3f] hover:text-white"
                      >
                        View Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 mb-4">No service requests available yet.</p>
              {userId && (
                <Link href="/services/new">
                  <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Request
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

