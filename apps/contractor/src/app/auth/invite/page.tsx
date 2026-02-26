import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AcceptInviteButton } from "./accept-button";

interface InvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <InviteLayout>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>No invite token provided.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </InviteLayout>
    );
  }

  // Fetch invite using admin client (bypasses RLS for unauthenticated users)
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("invites")
    .select("*, companies ( name )")
    .eq("token", token)
    .is("accepted_at", null)
    .single();

  if (!invite) {
    return (
      <InviteLayout>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invite Not Found</CardTitle>
            <CardDescription>
              This invite may have already been accepted, expired, or is invalid.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </InviteLayout>
    );
  }

  // Check if expired
  if (new Date(invite.expires_at) < new Date()) {
    return (
      <InviteLayout>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invite Expired</CardTitle>
            <CardDescription>
              This invite has expired. Ask your team admin to send a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </InviteLayout>
    );
  }

  const companyName =
    (invite.companies as Record<string, unknown>)?.name as string || "your team";
  const roleLabel = invite.role === "admin" ? "Admin" : "Team Member";

  // Check if user is logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Check if they already have a company
    const { data: profile } = await admin
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.company_id) {
      // Already part of a company — check if it's the same one
      if (profile.company_id === invite.company_id) {
        return (
          <InviteLayout>
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle>Already a Member</CardTitle>
                <CardDescription>
                  You&apos;re already a member of {companyName}.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          </InviteLayout>
        );
      }

      return (
        <InviteLayout>
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Already in a Company</CardTitle>
              <CardDescription>
                You&apos;re currently part of another company. You&apos;ll need
                to leave your current company before joining {companyName}.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </InviteLayout>
      );
    }

    // Logged in but no company — show accept button
    return (
      <InviteLayout>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Join {companyName}</CardTitle>
            <CardDescription>
              You&apos;ve been invited to join as a <strong>{roleLabel}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Signed in as <strong>{user.email}</strong></p>
            </div>
            <AcceptInviteButton token={token} />
          </CardContent>
        </Card>
      </InviteLayout>
    );
  }

  // Not logged in — show sign up / login options
  const callbackUrl = encodeURIComponent(`/auth/invite?token=${token}`);

  return (
    <InviteLayout>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Join {companyName}</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join as a <strong>{roleLabel}</strong>.
            Sign in or create an account to accept.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild>
            <Link href={`/signup?redirect=${callbackUrl}`}>
              Create Account
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/login?redirect=${callbackUrl}`}>
              Sign In
            </Link>
          </Button>
        </CardContent>
      </Card>
    </InviteLayout>
  );
}

function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        {/* Brand */}
        <div className="text-2xl font-bold tracking-wider uppercase">
          <span className="text-cyan-400">4</span>
          <span className="text-slate-900">M</span>
          <span className="text-green-400">A</span>
          <span className="text-slate-900">RG</span>
          <span className="text-green-400">I</span>
          <span className="text-slate-900">N</span>
        </div>
        {children}
      </div>
    </div>
  );
}
