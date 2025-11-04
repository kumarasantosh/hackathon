"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationPicker } from "@/components/location-picker";
import { WalletTopupButton } from "@/components/wallet-topup-button";
import { Loader2, AlertCircle } from "lucide-react";

const serviceRequestSchema = z.object({
  service_name: z.string().min(1, "Service name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(1, "Location is required"),
  type: z.enum(["free", "paid"]),
  amount: z.number().optional(),
  is_urgent: z.boolean().default(false),
  service_dates: z.array(z.string()).min(1, "At least one date is required"),
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

export default function NewServiceRequestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [insufficientBalance, setInsufficientBalance] = useState<{
    required: number;
    current: number;
    insufficientAmount: number;
    amountPerPerson?: number;
    peopleNeeded?: number;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ServiceRequestFormData>({
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: {
      type: "free",
      is_urgent: false,
      service_dates: [],
    },
  });

  const serviceType = watch("type");
  const isUrgent = watch("is_urgent");

  // Simple date picker for service dates
  const handleDateChange = (dateStr: string) => {
    const updated = selectedDates.includes(dateStr)
      ? selectedDates.filter(d => d !== dateStr)
      : [...selectedDates, dateStr];
    setSelectedDates(updated);
    setValue("service_dates", updated, { shouldValidate: true });
  };

  // Generate dates for next 60 days
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
    
    // Ensure dates are included
    if (selectedDates.length === 0) {
      setSubmitError("Please select at least one date");
      setIsSubmitting(false);
      return;
    }

    const formData = {
      ...data,
      service_dates: selectedDates,
    };
    
    try {
      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json();

      if (response.ok) {
        router.push("/services");
      } else {
        // If redirect is provided (verification required), redirect instead of showing error
        if (responseData.redirect && response.status === 403) {
          router.push(responseData.redirect + "?redirect=/services/new");
          return;
        }
        
        // Handle insufficient balance
        if (responseData.insufficientBalance && response.status === 402) {
          setInsufficientBalance({
            required: responseData.requiredAmount || 0,
            current: responseData.currentBalance || 0,
            insufficientAmount: responseData.insufficientAmount || 0,
            amountPerPerson: responseData.amountPerPerson,
            peopleNeeded: responseData.peopleNeeded,
          });
          setSubmitError(responseData.message || "Insufficient wallet balance");
          return;
        }
        
        let errorMessage = responseData.error || "Failed to create service request";
        if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.details) {
          errorMessage = `${errorMessage}: ${responseData.details}`;
        }
        setSubmitError(errorMessage);
        setInsufficientBalance(null);
        console.error("Service request creation failed:", responseData);
      }
    } catch (error: any) {
      console.error("Error:", error);
      setSubmitError(error?.message || "Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableDates = getAvailableDates();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle>Request a Service / Volunteer</CardTitle>
          <CardDescription>
            Post a request for help from your neighbors - services, volunteers, or assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Service Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Service Name *
              </label>
              <input
                {...register("service_name")}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Need help moving furniture"
              />
              {errors.service_name && (
                <p className="text-red-500 text-sm mt-1">{errors.service_name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Description *
              </label>
              <textarea
                {...register("description")}
                rows={4}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Describe what service or help you need..."
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Location *
              </label>
              <LocationPicker
                value={watch("location")}
                onChange={(location) => setValue("location", location, { shouldValidate: true })}
                error={errors.location?.message}
              />
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
              )}
            </div>

            {/* Service Dates */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Dates When Service is Needed *
              </label>
              <div className="border rounded-md p-4 max-h-64 overflow-y-auto">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
                  {availableDates.map((dateStr) => {
                    const date = new Date(dateStr);
                    const isSelected = selectedDates.includes(dateStr);
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                    
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={isPast}
                        onClick={() => handleDateChange(dateStr)}
                        className={`
                          px-2 py-1 text-xs rounded border transition-colors
                          ${isSelected
                            ? "bg-[#1a5f3f] text-white border-[#1a5f3f]"
                            : isPast
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          }
                        `}
                      >
                        {date.getDate()}/{date.getMonth() + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedDates.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} selected
                </p>
              )}
              {errors.service_dates && (
                <p className="text-red-500 text-sm mt-1">{errors.service_dates.message}</p>
              )}
            </div>

            {/* Type: Free or Paid */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Service Type *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="free"
                    {...register("type")}
                    className="mr-2"
                  />
                  Free (Volunteer)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="paid"
                    {...register("type")}
                    className="mr-2"
                  />
                  Paid Service
                </label>
              </div>
            </div>

            {/* Amount (for paid services) */}
            {serviceType === "paid" && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount (₹) *
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

            {/* Urgent Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_urgent"
                {...register("is_urgent")}
                className="mr-2 w-4 h-4"
              />
              <label htmlFor="is_urgent" className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className={`w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-gray-400'}`} />
                Mark as Urgent
              </label>
            </div>
            {isUrgent && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  ⚠️ Urgent requests will be highlighted and prioritized
                </p>
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{submitError}</p>
              </div>
            )}

            {/* Insufficient Balance Message */}
            {insufficientBalance && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-semibold mb-2 text-blue-900">Insufficient Wallet Balance</p>
                <div className="text-blue-800 mb-3 space-y-1">
                  {insufficientBalance.amountPerPerson && insufficientBalance.peopleNeeded && (
                    <p className="text-sm">
                      Amount per person: ₹{insufficientBalance.amountPerPerson.toFixed(2)} × {insufficientBalance.peopleNeeded} {insufficientBalance.peopleNeeded === 1 ? 'person' : 'people'}
                    </p>
                  )}
                  <p>Total Required: ₹{insufficientBalance.required.toFixed(2)}</p>
                  <p>Available: ₹{insufficientBalance.current.toFixed(2)}</p>
                  <p className="font-semibold">Need to add: ₹{insufficientBalance.insufficientAmount.toFixed(2)}</p>
                </div>
                <WalletTopupButton
                  amount={insufficientBalance.insufficientAmount}
                  onSuccess={async () => {
                    // After successful topup, retry submitting the form
                    setInsufficientBalance(null);
                    setSubmitError(null);
                    const formData = getValues();
                    await onSubmit(formData);
                  }}
                />
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-[#1a5f3f] hover:bg-[#2d7a55] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Request...
                </>
              ) : (
                "Create Service Request"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

