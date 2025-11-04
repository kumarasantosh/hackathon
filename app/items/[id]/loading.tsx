import { ImageSkeleton } from "@/components/ui/loading";

export default function ItemDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button Skeleton */}
        <div className="mb-6 animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-32" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Image Section Skeleton */}
          <div className="lg:col-span-3">
            <ImageSkeleton />
          </div>

          {/* Details Section Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border-0 shadow-xl rounded-2xl overflow-hidden animate-pulse">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6">
                <div className="h-8 bg-white/20 rounded w-3/4 mb-4" />
                <div className="h-12 bg-white/20 rounded w-32 mb-4" />
                <div className="h-4 bg-white/20 rounded w-48" />
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-24" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
                <div className="border-t pt-6 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-32" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                </div>
                <div className="border-t pt-6 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-28" />
                  <div className="h-4 bg-gray-200 rounded w-40" />
                  <div className="h-4 bg-gray-200 rounded w-32" />
                </div>
                <div className="border-t pt-6">
                  <div className="h-12 bg-gray-200 rounded w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

