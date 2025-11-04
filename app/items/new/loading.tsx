export default function NewItemLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="bg-white border-0 shadow-sm rounded-2xl animate-pulse overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="h-7 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-64" />
        </div>

        {/* Form Fields */}
        <div className="p-6 space-y-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-10 bg-gray-200 rounded w-full" />
            </div>
          ))}
          <div className="h-32 bg-gray-200 rounded w-full" />
          <div className="flex gap-4">
            <div className="h-10 bg-gray-200 rounded w-32" />
            <div className="h-10 bg-gray-200 rounded w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

