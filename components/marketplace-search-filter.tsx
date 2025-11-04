"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Filter } from "lucide-react";

const categories = [
  { value: "all", label: "All Categories" },
  { value: "tools", label: "Tools" },
  { value: "electronics", label: "Electronics" },
  { value: "furniture", label: "Furniture" },
  { value: "books", label: "Books" },
  { value: "sports", label: "Sports & Fitness" },
  { value: "clothing", label: "Clothing" },
  { value: "kitchen", label: "Kitchen Items" },
  { value: "other", label: "Other" },
];

export function MarketplaceSearchFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const currentQuery = searchParams.get("q") || "";
  const currentCategory = searchParams.get("category") || "all";
  const currentTab = searchParams.get("tab") || "products";
  
  const [searchQuery, setSearchQuery] = useState(currentQuery);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);

  const updateURL = (query: string, category: string) => {
    const urlParams = new URLSearchParams();
    
    if (query.trim()) {
      urlParams.set("q", query.trim());
    }
    
    if (category && category !== "all") {
      urlParams.set("category", category);
    }
    
    if (currentTab) {
      urlParams.set("tab", currentTab);
    }
    
    const url = urlParams.toString() ? `/marketplace?${urlParams.toString()}` : `/marketplace?tab=${currentTab}`;
    
    startTransition(() => {
      router.push(url);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL(searchQuery, selectedCategory);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    updateURL(searchQuery, category);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    router.push(`/marketplace?tab=${currentTab}`);
  };

  const hasActiveFilters = currentQuery || (currentCategory && currentCategory !== "all");

  return (
    <div className="mb-8 space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search items by name, description or category"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-24 h-12 text-base"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                updateURL("", selectedCategory);
              }}
              className="h-8 px-2"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className="h-8 bg-[#1a5f3f] hover:bg-[#2d7a55] text-white"
          >
            {isPending ? "Searching..." : "Search"}
          </Button>
        </div>
      </form>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="w-4 h-4" />
          <span>Filter by Category:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category.value}
              type="button"
              variant={selectedCategory === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoryChange(category.value)}
              className={
                selectedCategory === category.value
                  ? "bg-[#1a5f3f] hover:bg-[#2d7a55] text-white"
                  : "border-gray-300 hover:border-[#1a5f3f] hover:text-[#1a5f3f]"
              }
            >
              {category.label}
            </Button>
          ))}
        </div>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <span className="font-medium">Active filters:</span>
          {currentQuery && (
            <span className="px-2 py-1 bg-blue-100 rounded">
              Search: &quot;{currentQuery}&quot;
            </span>
          )}
          {currentCategory && currentCategory !== "all" && (
            <span className="px-2 py-1 bg-blue-100 rounded">
              Category: {categories.find(c => c.value === currentCategory)?.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

