import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function Loading({ size = "md", className, text }: LoadingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-blue-600", sizeClasses[size])} />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
}

// Full page loading with animations
export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 animate-fade-in">
      <div className="text-center animate-scale-in">
        <div className="relative">
          <Loader2 className="w-16 h-16 animate-spin text-[#1a5f3f] mx-auto mb-4" />
          <div className="absolute inset-0 rounded-full border-4 border-[#1a5f3f]/20 animate-ping"></div>
        </div>
        <p className="text-gray-600 font-medium animate-pulse">Loading...</p>
        <div className="flex items-center justify-center space-x-2 mt-4">
          <div className="w-2 h-2 bg-[#1a5f3f] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
          <div className="w-2 h-2 bg-[#1a5f3f] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
          <div className="w-2 h-2 bg-[#1a5f3f] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
        </div>
      </div>
    </div>
  );
}

// Skeleton loader for cards
export function CardSkeleton() {
  return (
    <div className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden animate-pulse">
      <div className="h-48 w-full bg-gray-200" />
      <div className="p-6 space-y-4">
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-24" />
          <div className="h-9 bg-gray-200 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

// Skeleton loader for image
export function ImageSkeleton() {
  return (
    <div className="relative h-48 w-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 animate-pulse rounded-lg">
      <div className="absolute inset-0 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    </div>
  );
}

// Skeleton for dashboard stats
export function StatsSkeleton() {
  return (
    <div className="bg-white border-0 shadow-sm rounded-2xl animate-pulse">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 bg-gray-200 rounded-xl" />
          <div className="w-5 h-5 bg-gray-200 rounded" />
        </div>
        <div className="h-12 bg-gray-200 rounded w-20" />
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-3 bg-gray-200 rounded w-32" />
      </div>
    </div>
  );
}

