"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationPicker } from "@/components/location-picker";
import { ImageUpload } from "@/components/image-upload";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

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

export default function EditItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params?.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [item, setItem] = useState<any>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      type: "free",
      images: [],
    },
  });

  const itemType = watch("type");

  useEffect(() => {
    if (itemId) {
      fetchItem();
    }
  }, [itemId]);

  const fetchItem = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/items/${itemId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch item");
      }

      const data = await response.json();
      setItem(data.item);
      
      // Set form values
      setValue("title", data.item.title);
      setValue("description", data.item.description);
      setValue("category", data.item.category);
      setValue("location", data.item.location);
      setValue("type", data.item.type);
      setValue("amount", data.item.amount || undefined);
      setValue("images", data.item.images || []);
    } catch (err: any) {
      console.error("Error fetching item:", err);
      setSubmitError(err.message || "Failed to load item");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.ok) {
        router.push("/items/manage");
      } else {
        const errorMessage = responseData.error || "Failed to update item";
        const errorDetails = responseData.details || "";
        setSubmitError(`${errorMessage}${errorDetails ? `: ${errorDetails}` : ""}`);
        console.error("Item update failed:", responseData);
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
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#1a5f3f] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading item...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-700 mb-4">Item not found</p>
            <Link href="/items/manage">
              <Button variant="outline">Back to Manage Items</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/items/manage" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Manage Items
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Edit Item</CardTitle>
            <CardDescription>
              Update your item details
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
                  value={watch("location")}
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
                      Updating...
                    </>
                  ) : (
                    "Update Item"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/items/manage")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

