import { StatsSkeleton, CardSkeleton } from "@/components/ui/loading";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="container mx-auto px-8 py-8 max-w-[1400px]">
        {/* Header Skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-48 mb-2" />
          <div className="h-6 bg-gray-200 rounded w-64" />
        </div>

        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-4 gap-5 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <StatsSkeleton key={i} />
              ))}
            </div>

            {/* Items Grid Skeleton */}
            <div className="grid grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="w-80 space-y-6">
            <div className="bg-white border-0 shadow-sm rounded-2xl animate-pulse p-6">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

