"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    licenseNumber: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Session expired. Please sign in again.");
      router.push("/login");
      return;
    }

    // Create the company
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: form.companyName,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        license_number: form.licenseNumber || null,
      })
      .select()
      .single();

    if (companyError || !company) {
      toast.error("Failed to create company. Please try again.");
      setLoading(false);
      return;
    }

    // Create the user profile linked to the company
    const { error: userError } = await supabase.from("users").insert({
      id: user.id,
      company_id: company.id,
      full_name: user.user_metadata?.full_name || user.email || "User",
      email: user.email!,
      role: "owner",
    });

    if (userError) {
      toast.error("Failed to create profile. Please try again.");
      setLoading(false);
      return;
    }

    toast.success("Welcome to 4Margin!");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Set up your company
          </CardTitle>
          <CardDescription>
            Tell us about your roofing business to get started. You can update
            this later.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name *</Label>
              <Input
                id="companyName"
                placeholder="Great Roofing Co."
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Business address</Label>
              <Input
                id="address"
                placeholder="123 Main St"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Dallas"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="TX"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) =>
                    updateField("state", e.target.value.toUpperCase())
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  placeholder="75201"
                  maxLength={10}
                  value={form.zip}
                  onChange={(e) => updateField("zip", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseNumber">Contractor license #</Label>
              <Input
                id="licenseNumber"
                placeholder="Optional"
                value={form.licenseNumber}
                onChange={(e) => updateField("licenseNumber", e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Setting up..." : "Continue to dashboard"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
