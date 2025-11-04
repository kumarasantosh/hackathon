"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Edit, 
  Trash2, 
  MapPin, 
  Eye, 
  Loader2,
  Plus 
} from "lucide-react";

interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  location: string;
  type: "free" | "paid";
  amount: number | null;
  status: "available" | "rented" | "sold";
  created_at: string;
  updated_at: string;
}

export default function ManageItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/items");
      
      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }

      const data = await response.json();
      setItems(data.items || []);
    } catch (err: any) {
      console.error("Error fetching items:", err);
      setError(err.message || "Failed to load items");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (itemId: string, itemTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${itemTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(itemId);
      const response = await fetch(`/api/items/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete item");
      }

      // Remove item from state
      setItems(items.filter((item) => item.id !== itemId));
    } catch (err: any) {
      console.error("Error deleting item:", err);
      alert(err.message || "Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  };

  const extractCoordinates = (location: string): { lat: number; lng: number } | null => {
    if (!location) return null;
    const coordMatch = location.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/);
    if (coordMatch) {
      return {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2])
      };
    }
    return null;
  };

  const getCleanAddress = (location: string): string => {
    if (!location) return "";
    return location.split(" (")[0] || location;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#1a5f3f] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="container mx-auto px-8 py-8 max-w-[1400px]">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Manage Items
              </h1>
              <p className="text-gray-500">
                View, edit, and delete your listed items
              </p>
            </div>
            <Link href="/items/new">
              <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add New Item
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-700">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={fetchItems}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {items.length === 0 ? (
          <Card className="bg-white border-0 shadow-sm rounded-2xl">
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No items yet
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Start sharing items with your community!
              </p>
              <Link href="/items/new">
                <Button className="bg-[#1a5f3f] hover:bg-[#2d7a55] text-white rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Share Your First Item
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const cleanAddress = getCleanAddress(item.location);
              const coordinates = extractCoordinates(item.location);
              const googleMapsUrl = coordinates
                ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`
                : null;

              return (
                <Card
                  key={item.id}
                  className="bg-white border-0 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden"
                >
                  {/* Image */}
                  {item.images && item.images.length > 0 ? (
                    <div className="relative h-48 w-full">
                      <Image
                        src={item.images[0]}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="relative h-48 w-full bg-gradient-to-br from-slate-200 via-gray-200 to-slate-300 flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                  )}

                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg font-bold text-gray-900 line-clamp-1">
                        {item.title}
                      </CardTitle>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0 ml-2 ${
                          item.status === "available"
                            ? "bg-green-100 text-green-700"
                            : item.status === "rented"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 mb-2">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
                      <span className="text-xs line-clamp-1">{cleanAddress}</span>
                    </div>
                    <CardDescription className="text-xs text-gray-400">
                      Category: {item.category}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xl font-bold text-gray-900">
                        {item.type === "free" ? (
                          <span className="text-emerald-600">Free</span>
                        ) : (
                          `₹${item.amount}`
                        )}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/items/${item.id}`}
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          className="w-full border-gray-300 hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </Link>
                      <Link
                        href={`/items/edit/${item.id}`}
                        className="flex-1"
                      >
                        <Button
                          className="w-full bg-[#1a5f3f] hover:bg-[#2d7a55] text-white"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(item.id, item.title)}
                        disabled={deletingId === item.id}
                        className="flex-1"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

