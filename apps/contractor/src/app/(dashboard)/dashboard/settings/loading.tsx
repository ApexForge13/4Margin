export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Company section skeleton */}
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-6 h-5 w-36 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-10 w-full animate-pulse rounded-md bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      {/* Profile section skeleton */}
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-6 h-5 w-28 animate-pulse rounded bg-gray-200" />
        <div className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-64 animate-pulse rounded-md bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
