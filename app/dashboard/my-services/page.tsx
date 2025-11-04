"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, IndianRupee, HeartHandshake, CheckCircle2, Loader2, Users, Clock, AlertCircle, Edit, Trash2 } from "lucide-react";
import { MarkServiceCompletedButton } from "@/components/mark-service-completed-button";
import { MarkServiceCompletedButtonByServiceId } from "@/components/mark-service-completed-button-by-service-id";
import Link from "next/link";

interface ServiceRequest {
  id: string;
  service_name: string;
  description: string;
  location: string;
  type: string;
  amount: number;
  status: string;
  is_urgent: boolean;
  people_needed: number;
  created_at: string;
  order_id?: string | null;
  order_status?: string | null;
  service_request_dates?: Array<{
    service_date: string;
  }>;
  service_offers?: Array<{
    id: string;
    status: string;
    provider_id: string;
  }>;
}

export default function MyServicesPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [services, setServices] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
      return;
    }

    if (isLoaded && isSignedIn) {
      fetchMyServices();
    }
  }, [isLoaded, isSignedIn, router]);

  const fetchMyServices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/service-requests/my");
      
      if (!response.ok) {
        throw new Error("Failed to fetch services");
      }

      const data = await response.json();
      setServices(data.services || []);
    } catch (err: any) {
      setError(err.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (serviceId: string, serviceName: string) => {
    if (!confirm(`Are you sure you want to delete "${serviceName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/service-requests/${serviceId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh the list
        fetchMyServices();
      } else {
        alert(data.error || "Failed to delete service");
      }
    } catch (error: any) {
      alert("An error occurred. Please try again.");
      console.error("Error deleting service:", error);
    }
  };

  // Helper function to check if service can be marked as completed
  const canMarkAsCompleted = (service: ServiceRequest) => {
    if (service.status === "completed" || service.status === "cancelled") {
      return false;
    }

    if (!service.service_request_dates || service.service_request_dates.length === 0) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const serviceDates = service.service_request_dates
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
  };

  // Helper function to get accepted volunteers count
  const getAcceptedCount = (service: ServiceRequest) => {
    if (!service.service_offers) return 0;
    return service.service_offers.filter((offer: any) => offer.status === "accepted").length;
  };

  // Helper function to get service dates display
  const getServiceDatesDisplay = (service: ServiceRequest) => {
    if (!service.service_request_dates || service.service_request_dates.length === 0) {
      return "No dates set";
    }

    const dates = service.service_request_dates
      .map((d: any) => new Date(d.service_date))
      .filter((d: Date) => !isNaN(d.getTime()))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    if (dates.length === 0) return "No dates set";

    if (dates.length === 1) {
      return dates[0].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    const firstDate = dates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const lastDate = dates[dates.length - 1].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    
    return `${firstDate} - ${lastDate}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-[#1a5f3f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          </div>
          <p className="text-gray-500 animate-pulse">Loading your services...</p>
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
            <Button onClick={fetchMyServices} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl animate-fade-in">
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Services</h1>
            <p className="text-gray-500">
              View and manage all your service requests
            </p>
          </div>
          <Link href="/services/new">
            <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white">
              Create New Service
            </Button>
          </Link>
        </div>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <HeartHandshake className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No services yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              You haven't created any service requests yet. Start by creating your first service!
            </p>
            <Link href="/services/new">
              <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white">
                Create Service Request
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {services.map((service) => {
            const acceptedCount = getAcceptedCount(service);
            const peopleNeeded = service.people_needed || 1;
            const canMark = canMarkAsCompleted(service);
            const isPaid = service.type === "paid";
            
            return (
              <Card key={service.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <HeartHandshake className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-xl mb-1">{service.service_name}</CardTitle>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                service.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : service.status === "cancelled"
                                  ? "bg-gray-100 text-gray-800"
                                  : service.status === "in_progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {service.status.replace("_", " ").toUpperCase()}
                            </span>
                            {service.is_urgent && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                URGENT
                              </span>
                            )}
                            {isPaid && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                                PAID
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {isPaid && service.amount && (
                      <div className="flex items-center gap-1 text-2xl font-bold text-gray-900">
                        <IndianRupee className="w-6 h-6" />
                        {service.amount.toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Description */}
                    <p className="text-sm text-gray-600">{service.description}</p>
                    
                    {/* Service Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Location</p>
                          <p className="text-sm font-medium text-gray-900">{service.location.split(" (")[0]}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Service Dates</p>
                          <p className="text-sm font-medium text-gray-900">{getServiceDatesDisplay(service)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Volunteers</p>
                          <p className="text-sm font-medium text-gray-900">
                            {acceptedCount} / {peopleNeeded} {acceptedCount >= peopleNeeded ? "✓" : ""}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Created</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(service.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex gap-2">
                        <Link href={`/services/${service.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {canMark && (
                          <div className="flex-1">
                            {service.order_id ? (
                              <MarkServiceCompletedButton
                                orderId={service.order_id}
                                onSuccess={fetchMyServices}
                              />
                            ) : (
                              <MarkServiceCompletedButtonByServiceId
                                serviceId={service.id}
                                onSuccess={fetchMyServices}
                              />
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Edit and Delete buttons - only show if service is not completed or cancelled */}
                      {(service.status === "open" || service.status === "in_progress") && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Link href={`/services/edit/${service.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={() => handleDelete(service.id, service.service_name)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      )}
                      
                      {canMark && (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-blue-600" />
                          <p className="text-xs text-blue-800">
                            Today is the last service date. You can mark this service as completed.
                          </p>
                        </div>
                      )}
                      
                      {service.status === "completed" && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <p className="text-xs text-green-800">
                            This service has been completed. Payments have been processed.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

