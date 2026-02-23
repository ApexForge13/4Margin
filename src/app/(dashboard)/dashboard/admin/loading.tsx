export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b">
        {["Xactimate Codes", "Carriers", "Team"].map((label) => (
          <div key={label} className="border-b-2 border-transparent px-1 pb-3">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <div className="h-9 w-64 animate-pulse rounded-md bg-gray-200" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-gray-200" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
              <div className="ml-auto h-8 w-8 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
