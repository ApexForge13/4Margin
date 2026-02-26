export default function SupplementsLoading() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-9 w-28 animate-pulse rounded bg-gray-200" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-white">
        {/* Table header */}
        <div className="flex gap-4 border-b p-4">
          <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200" />
        </div>
        {/* Table rows */}
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
              <div className="ml-auto h-8 w-8 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
