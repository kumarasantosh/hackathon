import { CardSkeleton } from "@/components/ui/loading";

export default function OrderDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header Skeleton */}
      <div className="mb-8 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-6 bg-gray-200 rounded w-64" />
      </div>

      {/* Order Card Skeleton */}
      <CardSkeleton />
    </div>
  );
}

