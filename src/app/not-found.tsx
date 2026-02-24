import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060A13] px-6 text-center">
      {/* Brand logo */}
      <div className="mb-8 text-2xl font-bold tracking-widest uppercase">
        <span className="text-[#00BFFF]">4</span>
        <span className="text-white">M</span>
        <span className="text-[#39FF9E]">A</span>
        <span className="text-white">RG</span>
        <span className="text-[#39FF9E]">I</span>
        <span className="text-white">N</span>
      </div>

      {/* 404 hero */}
      <h1 className="mb-2 text-7xl font-extrabold text-white">404</h1>
      <h2 className="mb-4 text-xl font-semibold text-zinc-300">
        Page not found
      </h2>
      <p className="mb-8 max-w-md text-sm text-zinc-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      {/* Actions */}
      <div className="flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-[#060A13] transition hover:bg-zinc-200"
        >
          Go Home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
