export default function UploadLoading() {
  return (
    <div className="space-y-6">
      {/* Step indicator skeleton */}
      <div className="flex items-center justify-center gap-4 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            <div className="hidden sm:block h-3 w-20 animate-pulse rounded bg-gray-200" />
            {i < 3 && <div className="hidden sm:block h-0.5 w-12 animate-pulse bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="rounded-lg border bg-white p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-40 w-full animate-pulse rounded-lg border-2 border-dashed bg-gray-100" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-10 w-full animate-pulse rounded-md bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
