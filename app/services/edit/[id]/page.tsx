"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationPicker } from "@/components/location-picker";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const serviceRequestSchema = z.object({
  service_name: z.string().min(1, "Service name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(1, "Location is required"),
  type: z.enum(["free", "paid"]),
  amount: z.number().optional(),
  is_urgent: z.boolean().default(false),
  service_dates: z.array(z.string()).min(1, "At least one date is required"),
  people_needed: z.number().int().min(1, "At least 1 person is required").default(1),
}).refine((data) => {
  if (data.type === "paid") {
    return data.amount !== undefined && data.amount > 0;
  }
  return true;
}, {
  message: "Amount is required for paid services",
  path: ["amount"],
});

type ServiceRequestFormData = z.infer<typeof serviceRequestSchema>;

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params?.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [service, setService] = useState<any>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ServiceRequestFormData>({
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: {
      type: "free",
      is_urgent: false,
      service_dates: [],
      people_needed: 1,
    },
  });

  const serviceType = watch("type");
  const isUrgent = watch("is_urgent");

  useEffect(() => {
    if (serviceId) {
      fetchService();
    }
  }, [serviceId]);

  const fetchService = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/service-requests/${serviceId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch service");
      }

      const data = await response.json();
      setService(data.service);
      
      // Set form values
      setValue("service_name", data.service.service_name);
      setValue("description", data.service.description);
      setValue("location", data.service.location);
      setValue("type", data.service.type);
      setValue("amount", data.service.amount || undefined);
      setValue("is_urgent", data.service.is_urgent || false);
      setValue("people_needed", data.service.people_needed || 1);
      
      // Set dates
      const dates = data.service.service_request_dates?.map((d: any) => d.service_date) || [];
      setSelectedDates(dates);
      setValue("service_dates", dates);
    } catch (err: any) {
      console.error("Error fetching service:", err);
      setSubmitError(err.message || "Failed to load service");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (dateStr: string) => {
    const updated = selectedDates.includes(dateStr)
      ? selectedDates.filter(d => d !== dateStr)
      : [...selectedDates, dateStr];
    setSelectedDates(updated);
    setValue("service_dates", updated, { shouldValidate: true });
  };

  const getAvailableDates = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const onSubmit = async (data: ServiceRequestFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    if (selectedDates.length === 0) {
      setSubmitError("Please select at least one date");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/service-requests/${serviceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          service_dates: selectedDates,
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        router.push("/dashboard/my-services");
      } else {
        setSubmitError(responseData.error || "Failed to update service");
      }
    } catch (error: any) {
      console.error("Error:", error);
      setSubmitError(error?.message || "Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Loading service...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitError && !service) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-red-600 mb-4">{submitError}</p>
              <Link href="/dashboard/my-services">
                <Button>Back to My Services</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const availableDates = getAvailableDates();

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/dashboard/my-services" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Services
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Edit Service Request</CardTitle>
            <CardDescription>
              Update your service request details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Service Name *
                </label>
                <input
                  {...register("service_name")}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Help with moving"
                />
                {errors.service_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.service_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description *
                </label>
                <textarea
                  {...register("description")}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Describe your service request..."
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Pickup Location *
                </label>
                <LocationPicker
                  value={watch("location") || ""}
                  onChange={(location) => {
                    setValue("location", location, { shouldValidate: true });
                  }}
                  error={errors.location?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Service Type *
                </label>
                <select
                  {...register("type")}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="free">Free (Volunteer)</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              {serviceType === "paid" && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Amount per Person (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("amount", { valueAsNumber: true })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  People Needed *
                </label>
                <input
                  type="number"
                  min="1"
                  {...register("people_needed", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="1"
                />
                {errors.people_needed && (
                  <p className="text-red-500 text-sm mt-1">{errors.people_needed.message}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register("is_urgent")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Mark as Urgent</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Service Dates *
                </label>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-2">
                    {availableDates.map((dateStr) => {
                      const isSelected = selectedDates.includes(dateStr);
                      const date = new Date(dateStr);
                      const isPast = date < new Date();
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => !isPast && handleDateChange(dateStr)}
                          disabled={isPast}
                          className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                            isSelected
                              ? "bg-[#1a5f3f] text-white border-[#1a5f3f]"
                              : isPast
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                              : "bg-white text-gray-700 border-gray-300 hover:border-[#1a5f3f] hover:text-[#1a5f3f]"
                          }`}
                        >
                          {date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {selectedDates.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Selected: {selectedDates.length} date{selectedDates.length > 1 ? "s" : ""}
                  </p>
                )}
                {errors.service_dates && (
                  <p className="text-red-500 text-sm mt-1">{errors.service_dates.message}</p>
                )}
              </div>

              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{submitError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#1a5f3f] hover:bg-[#2d7a55] text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Service"
                  )}
                </Button>
                <Link href="/dashboard/my-services" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

