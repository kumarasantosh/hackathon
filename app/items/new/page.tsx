"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationPicker } from "@/components/location-picker";
import { ImageUpload } from "@/components/image-upload";
import { WalletTopupButton } from "@/components/wallet-topup-button";
import { Loader2, AlertCircle, Package, HeartHandshake, CheckCircle2, Users } from "lucide-react";

const itemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  location: z.string().min(1, "Location is required"),
  type: z.enum(["free", "paid"]),
  amount: z.number().optional(),
  images: z.array(z.string()).default([]),
}).refine((data) => {
  if (data.type === "paid") {
    return data.amount !== undefined && data.amount > 0;
  }
  return true;
}, {
  message: "Amount is required for paid items",
  path: ["amount"],
});

type ItemFormData = z.infer<typeof itemSchema>;

const serviceRequestSchema = z.object({
  service_name: z.string().min(1, "Service name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(1, "Location is required"),
  type: z.enum(["free", "paid"]),
  amount: z.number().optional(),
  is_urgent: z.boolean().default(false),
  service_dates: z.array(z.string()).min(1, "At least one date is required"),
  people_needed: z.number().int().min(1, "At least 1 person is required").default(1),
  auto_approve: z.boolean().default(false),
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

export default function NewItemPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"item" | "service">("item");
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
    reset,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      location: "",
      type: "free",
      amount: undefined,
      images: [],
    },
    mode: "onChange",
  });

  const itemType = watch("type");

  const onSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.ok) {
        router.push("/dashboard");
      } else {
        if (responseData.redirect && response.status === 403) {
          router.push(responseData.redirect + "?redirect=/items/new");
          return;
        }
        
        let errorMessage = responseData.error || "Failed to create item";
        if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.details) {
          errorMessage = `${errorMessage}: ${responseData.details}`;
        }
        setSubmitError(errorMessage);
        console.error("Item creation failed:", responseData);
      }
    } catch (error: any) {
      console.error("Error:", error);
      setSubmitError(error?.message || "Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Service Request Form - Using react-hook-form
  const {
    register: registerService,
    handleSubmit: handleServiceSubmit,
    watch: watchService,
    setValue: setServiceValue,
    getValues: getServiceValues,
    reset: resetService,
    formState: { errors: serviceErrors },
  } = useForm<ServiceRequestFormData>({
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: {
      type: "free",
      is_urgent: false,
      service_dates: [],
      people_needed: 1,
      auto_approve: false,
    },
    mode: "onChange",
  });

  const [selectedServiceDates, setSelectedServiceDates] = useState<string[]>([]);
  const serviceType = watchService("type");
  const isUrgent = watchService("is_urgent");

  const handleServiceDateChange = (dateStr: string) => {
    const updated = selectedServiceDates.includes(dateStr)
      ? selectedServiceDates.filter(d => d !== dateStr)
      : [...selectedServiceDates, dateStr];
    setSelectedServiceDates(updated);
    setServiceValue("service_dates", updated, { shouldValidate: true });
  };

  const getAvailableServiceDates = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const onServiceSubmit = async (data: ServiceRequestFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setInsufficientBalance(null);
    
    // Ensure dates are included
    if (selectedServiceDates.length === 0) {
      setSubmitError("Please select at least one date");
      setIsSubmitting(false);
      return;
    }

    const formData = {
      ...data,
      service_dates: selectedServiceDates,
    };
    
    try {
      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json();

      if (response.ok) {
        router.push("/dashboard");
      } else {
        if (responseData.redirect && response.status === 403) {
          router.push(responseData.redirect + "?redirect=/items/new");
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

  const availableServiceDates = getAvailableServiceDates();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl animate-fade-in">
      {/* Tabs */}
      <div className="mb-6 animate-fade-in-up">
        <div className="flex gap-2 border-b">
          <button
            type="button"
            onClick={() => {
              setActiveTab("item");
              setSubmitError(null);
              // Reset form to default values when switching tabs
              reset({
                title: "",
                description: "",
                category: "",
                location: "",
                type: "free",
                amount: undefined,
                images: [],
              });
            }}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "item"
                ? "border-[#1a5f3f] text-[#1a5f3f]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Package className="w-4 h-4" />
            Share an Item
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("service");
              setSubmitError(null);
              // Reset service form when switching tabs
              resetService({
                type: "free",
                is_urgent: false,
                service_dates: [],
              });
              setSelectedServiceDates([]);
            }}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "service"
                ? "border-[#1a5f3f] text-[#1a5f3f]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            Request Service / Volunteer
          </button>
        </div>
      </div>

      {activeTab === "item" ? (
        <Card>
          <CardHeader>
            <CardTitle>Share an Item</CardTitle>
            <CardDescription>
              List an item for sharing, renting, or selling to your neighbors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Title *
              </label>
              <input
                {...register("title")}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Electric Drill"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
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
                placeholder="Describe your item..."
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Category *
              </label>
              <select
                {...register("category")}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select a category</option>
                <option value="tools">Tools</option>
                <option value="electronics">Electronics</option>
                <option value="furniture">Furniture</option>
                <option value="books">Books</option>
                <option value="sports">Sports & Fitness</option>
                <option value="clothing">Clothing</option>
                <option value="kitchen">Kitchen Items</option>
                <option value="other">Other</option>
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
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
              {!watch("location") && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Please click on the map or use "Use Current Location" to select a location
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Type *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="free"
                    {...register("type")}
                    className="mr-2"
                  />
                  Free
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="paid"
                    {...register("type")}
                    className="mr-2"
                  />
                  Rent Amount
                </label>
              </div>
            </div>

            {itemType === "paid" && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
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
              <ImageUpload
                images={watch("images") || []}
                onChange={(images) => {
                  setValue("images", images, { shouldValidate: true });
                }}
                maxImages={5}
              />
            </div>

            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700 font-medium">Error:</p>
                <p className="text-sm text-red-600 mt-1">{submitError}</p>
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Item"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Request a Service / Volunteer</CardTitle>
            <CardDescription>
              Post a request for help from your neighbors - services, volunteers, or assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleServiceSubmit(onServiceSubmit)} className="space-y-6">
              {/* Service Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Service Name *
                </label>
                <input
                  {...registerService("service_name")}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Need help moving furniture"
                />
                {serviceErrors.service_name && (
                  <p className="text-red-500 text-sm mt-1">{serviceErrors.service_name.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description *
                </label>
                <textarea
                  {...registerService("description")}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Describe what service or help you need..."
                />
                {serviceErrors.description && (
                  <p className="text-red-500 text-sm mt-1">{serviceErrors.description.message}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Location *
                </label>
                <LocationPicker
                  value={watchService("location") || ""}
                  onChange={(location) => setServiceValue("location", location, { shouldValidate: true })}
                  error={serviceErrors.location?.message}
                />
                {serviceErrors.location && (
                  <p className="text-red-500 text-sm mt-1">{serviceErrors.location.message}</p>
                )}
              </div>

              {/* Service Dates */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Dates When Service is Needed *
                </label>
                <div className="border rounded-md p-4 max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
                    {availableServiceDates.map((dateStr) => {
                      const date = new Date(dateStr);
                      const isSelected = selectedServiceDates.includes(dateStr);
                      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                      
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          disabled={isPast}
                          onClick={() => handleServiceDateChange(dateStr)}
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
                {selectedServiceDates.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedServiceDates.length} date{selectedServiceDates.length > 1 ? 's' : ''} selected
                  </p>
                )}
                {serviceErrors.service_dates && (
                  <p className="text-red-500 text-sm mt-1">{serviceErrors.service_dates.message}</p>
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
                      {...registerService("type")}
                      className="mr-2"
                    />
                    Free (Volunteer)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="paid"
                      {...registerService("type")}
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
                    {...registerService("amount", { valueAsNumber: true })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="0.00"
                  />
                  {serviceErrors.amount && (
                    <p className="text-red-500 text-sm mt-1">{serviceErrors.amount.message}</p>
                  )}
                </div>
              )}

              {/* People Needed */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  How Many People Needed? *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  {...registerService("people_needed", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="1"
                />
                {serviceErrors.people_needed && (
                  <p className="text-red-500 text-sm mt-1">{serviceErrors.people_needed.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  The service request will remain open until you have enough people or the service dates pass.
                </p>
              </div>

              {/* Auto Approve Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_approve"
                  {...registerService("auto_approve")}
                  className="mr-2 w-4 h-4"
                />
                <label htmlFor="auto_approve" className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className={`w-4 h-4 ${watchService("auto_approve") ? 'text-green-600' : 'text-gray-400'}`} />
                  Auto-Approve Offers
                </label>
              </div>
              {watchService("auto_approve") && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ Offers will be automatically approved until you have enough people. Manual review is disabled.
                  </p>
                </div>
              )}

              {/* Urgent Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_urgent"
                  {...registerService("is_urgent")}
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
                      const formData = getServiceValues();
                      await onServiceSubmit(formData);
                    }}
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white"
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
