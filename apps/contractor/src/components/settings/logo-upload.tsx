"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, ImageIcon } from "lucide-react";
import { uploadLogo, removeLogo } from "@/app/(dashboard)/dashboard/settings/actions";

interface LogoUploadProps {
  companyId: string;
  logoUrl: string | null;
  isOwner: boolean;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export function LogoUpload({ companyId, logoUrl, isOwner }: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error("Please upload a PNG, JPG, or SVG file.");
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error("File must be under 2 MB.");
        return;
      }

      // Show local preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const result = await uploadLogo(companyId, formData);
        if (result.error) {
          toast.error(result.error);
          setPreview(logoUrl); // revert
        } else {
          // Use the returned URL so the preview survives a cache bust
          setPreview(result.logoUrl ?? objectUrl);
          toast.success("Logo uploaded.");
        }
      } catch {
        toast.error("Upload failed. Please try again.");
        setPreview(logoUrl); // revert
      } finally {
        setUploading(false);
      }
    },
    [companyId, logoUrl]
  );

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const result = await removeLogo(companyId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setPreview(null);
        toast.success("Logo removed.");
      }
    } catch {
      toast.error("Failed to remove logo.");
    } finally {
      setRemoving(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so re-uploading the same file triggers onChange
    e.target.value = "";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Logo</CardTitle>
      </CardHeader>
      <CardContent>
        {!isOwner ? (
          // Read-only view for non-owners
          <div className="flex items-center gap-4">
            {preview ? (
              <div className="h-20 w-20 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-center overflow-hidden">
                <img
                  src={preview}
                  alt="Company logo"
                  className="h-full w-full object-contain p-1"
                />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Contact your company admin to update the logo.
            </p>
          </div>
        ) : (
          // Editable view for owners/admins
          <div className="space-y-4">
            {preview ? (
              // Logo preview with remove action
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 rounded-xl border border-border/50 bg-muted/30 shadow-sm flex items-center justify-center overflow-hidden">
                  <img
                    src={preview}
                    alt="Company logo"
                    className="h-full w-full object-contain p-2"
                  />
                </div>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Replace"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={handleRemove}
                    disabled={removing || uploading}
                  >
                    <X className="mr-2 h-4 w-4" />
                    {removing ? "Removing..." : "Remove"}
                  </Button>
                </div>
              </div>
            ) : (
              // Drop zone
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`
                  flex cursor-pointer flex-col items-center justify-center
                  rounded-xl border-2 border-dashed p-8 transition-colors
                  ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border/50 bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
                  }
                  ${uploading ? "pointer-events-none opacity-60" : ""}
                `}
              >
                <Upload className="mb-2 h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm font-medium text-muted-foreground">
                  {uploading
                    ? "Uploading..."
                    : "Drop your logo here or click to browse"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  PNG, JPG, or SVG &mdash; max 2 MB
                </p>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg"
              className="hidden"
              onChange={onInputChange}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
