"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { updateCompany, updateProfile } from "./actions";

interface SettingsFormProps {
  profile: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    companies: {
      name: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
      license_number: string | null;
    };
  };
}

export function SettingsForm({ profile }: SettingsFormProps) {
  // Company form state
  const [companyName, setCompanyName] = useState(profile.companies.name || "");
  const [companyPhone, setCompanyPhone] = useState(profile.companies.phone || "");
  const [companyEmail, setCompanyEmail] = useState(profile.companies.email || "");
  const [companyAddress, setCompanyAddress] = useState(profile.companies.address || "");
  const [companyCity, setCompanyCity] = useState(profile.companies.city || "");
  const [companyState, setCompanyState] = useState(profile.companies.state || "");
  const [companyZip, setCompanyZip] = useState(profile.companies.zip || "");
  const [licenseNumber, setLicenseNumber] = useState(profile.companies.license_number || "");
  const [companySaving, setCompanySaving] = useState(false);

  // Profile form state
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [profileSaving, setProfileSaving] = useState(false);

  const isOwnerOrAdmin = profile.role === "owner" || profile.role === "admin";

  const handleCompanySave = async () => {
    if (!companyName.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setCompanySaving(true);
    const result = await updateCompany({
      name: companyName.trim(),
      phone: companyPhone.trim(),
      email: companyEmail.trim(),
      address: companyAddress.trim(),
      city: companyCity.trim(),
      state: companyState.trim(),
      zip: companyZip.trim(),
      licenseNumber: licenseNumber.trim(),
    });
    setCompanySaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Company information updated.");
    }
  };

  const handleProfileSave = async () => {
    if (!fullName.trim()) {
      toast.error("Name is required.");
      return;
    }
    setProfileSaving(true);
    const result = await updateProfile({ fullName: fullName.trim() });
    setProfileSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={!isOwnerOrAdmin || companySaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License number</Label>
              <Input
                id="licenseNumber"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                disabled={!isOwnerOrAdmin || companySaving}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Phone</Label>
              <Input
                id="companyPhone"
                type="tel"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                disabled={!isOwnerOrAdmin || companySaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Email</Label>
              <Input
                id="companyEmail"
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                disabled={!isOwnerOrAdmin || companySaving}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="companyAddress">Address</Label>
            <Input
              id="companyAddress"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              disabled={!isOwnerOrAdmin || companySaving}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="companyCity">City</Label>
              <Input
                id="companyCity"
                value={companyCity}
                onChange={(e) => setCompanyCity(e.target.value)}
                disabled={!isOwnerOrAdmin || companySaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyState">State</Label>
              <Input
                id="companyState"
                value={companyState}
                onChange={(e) => setCompanyState(e.target.value)}
                disabled={!isOwnerOrAdmin || companySaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyZip">Zip</Label>
              <Input
                id="companyZip"
                value={companyZip}
                onChange={(e) => setCompanyZip(e.target.value)}
                disabled={!isOwnerOrAdmin || companySaving}
              />
            </div>
          </div>

          {isOwnerOrAdmin ? (
            <Button onClick={handleCompanySave} disabled={companySaving}>
              {companySaving ? "Saving..." : "Save Company Info"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only company owners can edit company information. Contact your
              company owner if changes are needed.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={profileSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profileEmail">Email</Label>
              <Input
                id="profileEmail"
                type="email"
                value={profile.email}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Email is linked to your login and cannot be changed here.
              </p>
            </div>
          </div>
          <Button onClick={handleProfileSave} disabled={profileSaving}>
            {profileSaving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
