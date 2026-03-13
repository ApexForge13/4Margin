"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  companies: {
    name: string;
    account_type?: string;
  };
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/supplements": "Jobs",
  "/dashboard/upload": "New Job",
  "/dashboard/policy-checks": "Policy Checks",
  "/dashboard/policy-decoder": "Policy Decoder",
  "/dashboard/documents": "Documents",
  "/dashboard/knowledge-base": "Knowledge Base",
  "/dashboard/settings": "Settings",
  "/dashboard/admin": "Admin",
  "/dashboard/enterprise": "Enterprise",
};

function resolvePageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/dashboard/supplements/")) return "Supplement Detail";
  if (pathname.startsWith("/dashboard/policy-checks/")) return "Policy Check Detail";
  if (pathname.startsWith("/dashboard/policy-decoder/")) return "Policy Decode";
  if (pathname.startsWith("/dashboard/enterprise")) return "Enterprise";
  return "Dashboard";
}

/* ─── Nav item definitions ─── */

const NAV_ICONS = {
  dashboard: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  supplements: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  upload: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  ),
  decoder: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  settings: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  knowledgeBase: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  newDecoder: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  documents: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  enterprise: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  admin: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

export function DashboardShell({
  user,
  children,
}: {
  user: UserProfile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  // Close profile dropdown on route change
  useEffect(() => {
    setProfileOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const isAdmin = user.role === "admin";
  const isEnterpriseOwner =
    user.role === "owner" &&
    user.companies?.account_type === "enterprise";

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: NAV_ICONS.dashboard },
    { label: "Jobs", href: "/dashboard/supplements", icon: NAV_ICONS.supplements },
    { label: "New Job", href: "/dashboard/upload", icon: NAV_ICONS.upload },
    { label: "Policy Decoder", href: "/dashboard/policy-decoder", icon: NAV_ICONS.decoder },
    { label: "New Decoder", href: "/dashboard/policy-decoder/new", icon: NAV_ICONS.newDecoder },
    { label: "Documents", href: "/dashboard/documents", icon: NAV_ICONS.documents },
    { label: "Knowledge Base", href: "/dashboard/knowledge-base", icon: NAV_ICONS.knowledgeBase },
    { label: "Settings", href: "/dashboard/settings", icon: NAV_ICONS.settings },
    ...(isEnterpriseOwner
      ? [{ label: "Enterprise", href: "/dashboard/enterprise", icon: NAV_ICONS.enterprise }]
      : []),
    ...(isAdmin
      ? [{ label: "Admin", href: "/dashboard/admin", icon: NAV_ICONS.admin }]
      : []),
  ];

  const pageTitle = resolvePageTitle(pathname);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    window.location.href = "/login";
  };

  /* ─── Sidebar content (shared between mobile + desktop) ─── */
  const sidebarContent = (
    <>
      {/* Logo + profile area */}
      <div className="flex h-[72px] items-center justify-between px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          {/* Favicon-style icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1a2035] to-[#0f1524] shadow-sm">
            <span className="text-xs font-extrabold leading-none">
              <span className="text-[#00BFFF]">4</span>
              <span className="text-white">M</span>
            </span>
          </div>
          <span className="text-sm font-semibold tracking-wide text-white/90">
            4MARGIN
          </span>
        </Link>

        {/* Close button — mobile only */}
        <button
          className="md:hidden rounded-lg p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-4 pt-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-white text-[#1a2035] shadow-[0_3px_10px_rgba(0,0,0,0.15)]"
                  : "text-white/60 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${
                  isActive
                    ? "bg-gradient-to-br from-[#00BFFF] to-[#0090cc] text-white shadow-[0_3px_6px_rgba(0,191,255,0.3)]"
                    : "bg-white/[0.06] text-white/50 group-hover:text-white/80"
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer — pushes nav to fill, keeps sidebar clean */}
      <div className="mb-4" />
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      {/* ─── Mobile sidebar overlay ─── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Mobile sidebar drawer ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-gradient-to-b from-[#1a2035] to-[#111827] transition-transform duration-250 ease-out md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          borderRadius: "0 1rem 1rem 0",
        }}
      >
        {sidebarContent}
      </aside>

      {/* ─── Desktop sidebar ─── */}
      <aside
        className="hidden md:flex w-[272px] shrink-0 flex-col m-4 rounded-2xl bg-gradient-to-b from-[#1a2035] to-[#111827]"
        style={{
          boxShadow: "0 20px 27px rgba(0, 0, 0, 0.05)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* ─── Main area ─── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-[72px] items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden rounded-xl p-2 text-[#344767]/60 hover:text-[#344767] hover:bg-white hover:shadow-soft transition-all"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-medium text-[#344767]/40">
                Pages / {pageTitle}
              </p>
              <h1 className="text-base font-bold text-[#344767]">{pageTitle}</h1>
            </div>
          </div>
          {/* Profile avatar + dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#00BFFF]/20 to-[#0090cc]/20 border border-[#344767]/10 hover:border-[#344767]/25 transition-all duration-200 group"
              aria-label="Profile menu"
            >
              <svg className="h-[18px] w-[18px] text-[#344767]/50 group-hover:text-[#344767]/80 transition-colors" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </button>

            {/* Profile dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white border border-[#344767]/10 shadow-xl shadow-black/10 z-50 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-[#344767]/[0.06]">
                  <p className="text-sm font-medium text-[#344767] truncate">{user.full_name}</p>
                  <p className="text-[11px] text-[#344767]/40 truncate">{user.email}</p>
                  {user.companies?.name && (
                    <p className="text-[11px] text-[#00BFFF]/80 truncate mt-0.5">{user.companies.name}</p>
                  )}
                </div>
                {/* Actions */}
                <div className="py-1.5">
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[#344767]/60 hover:text-[#344767] hover:bg-[#344767]/[0.04] transition-colors"
                    onClick={() => setProfileOpen(false)}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                  <button
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-red-400/70 hover:text-red-500 hover:bg-red-50/50 transition-colors"
                    onClick={handleSignOut}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto px-4 pb-8 md:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
