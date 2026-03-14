"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { LayoutDashboard, Briefcase, ClipboardCheck, Shield, FileText, Calculator, FolderOpen, BookOpen, Settings, ShieldAlert, Camera, Plus } from 'lucide-react';
import { NewServiceModal } from './new-service-modal';

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
  "/dashboard/jobs": "Jobs",
  "/dashboard/inspections": "Inspections",
  "/dashboard/policies": "Policies",
  "/dashboard/supplements": "Supplements",
  "/dashboard/quotes": "Quotes",
  "/dashboard/documents": "Documents",
  "/dashboard/knowledge-base": "Knowledge Base",
  "/dashboard/settings": "Settings",
  "/dashboard/admin": "Admin",
  "/dashboard/admin/photo-review": "Photo Review",
};

function resolvePageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/dashboard/jobs/")) return "Job Detail";
  if (pathname.startsWith("/dashboard/inspections/")) return "Inspection";
  if (pathname.startsWith("/dashboard/policies/")) return "Policy Decode";
  if (pathname.startsWith("/dashboard/supplements/")) return "Supplement Detail";
  if (pathname.startsWith("/dashboard/quotes/")) return "Quote";
  return "Dashboard";
}

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
  const [newModalOpen, setNewModalOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
    { label: "Jobs", href: "/dashboard/jobs", icon: <Briefcase className="h-[18px] w-[18px]" /> },
    { label: "Inspections", href: "/dashboard/inspections", icon: <ClipboardCheck className="h-[18px] w-[18px]" /> },
    { label: "Policies", href: "/dashboard/policies", icon: <Shield className="h-[18px] w-[18px]" /> },
    { label: "Supplements", href: "/dashboard/supplements", icon: <FileText className="h-[18px] w-[18px]" /> },
    { label: "Quotes", href: "/dashboard/quotes", icon: <Calculator className="h-[18px] w-[18px]" /> },
    { label: "Documents", href: "/dashboard/documents", icon: <FolderOpen className="h-[18px] w-[18px]" /> },
    { label: "Knowledge Base", href: "/dashboard/knowledge-base", icon: <BookOpen className="h-[18px] w-[18px]" /> },
    { label: "Settings", href: "/dashboard/settings", icon: <Settings className="h-[18px] w-[18px]" /> },
    ...(isAdmin
      ? [
          { label: "Admin", href: "/dashboard/admin", icon: <ShieldAlert className="h-[18px] w-[18px]" /> },
          { label: "Photo Review", href: "/dashboard/admin/photo-review", icon: <Camera className="h-[18px] w-[18px]" /> },
        ]
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

      {/* Profile at bottom */}
      <div className="mt-auto border-t border-white/10 p-4">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-3 w-full rounded-lg px-2 py-2 hover:bg-white/[0.06] transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#00BFFF]/30 to-[#0090cc]/30 flex items-center justify-center text-white text-sm font-medium shrink-0">
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="text-left min-w-0">
            <div className="text-[13px] font-medium text-white/80 truncate">{user?.full_name}</div>
            <div className="text-[11px] text-white/40 truncate">{user?.companies?.name}</div>
          </div>
        </button>
        {profileOpen && (
          <div className="mt-2 space-y-1 px-2">
            <Link
              href="/dashboard/settings"
              className="block px-3 py-1.5 text-[13px] text-white/60 rounded-lg hover:bg-white/[0.06] hover:text-white/80 transition-colors"
              onClick={() => setProfileOpen(false)}
            >
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="block w-full text-left px-3 py-1.5 text-[13px] text-red-400/70 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
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
          {/* New button */}
          <button
            onClick={() => setNewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#00BFFF] to-[#0090cc] text-white text-sm font-medium hover:shadow-lg hover:shadow-[#00BFFF]/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto px-4 pb-8 md:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      <NewServiceModal open={newModalOpen} onOpenChange={setNewModalOpen} />
    </div>
  );
}
