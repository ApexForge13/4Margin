"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/supabase/storage";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { FileList, type UploadedFile } from "@/components/upload/file-list";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function UploadPage() {
  const router = useRouter();
  const [estimates, setEstimates] = useState<UploadedFile[]>([]);
  const [photos, setPhotos] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleEstimateFiles = useCallback((files: File[]) => {
    const newFiles: UploadedFile[] = files.map((file) => ({
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setEstimates((prev) => [...prev, ...newFiles]);
  }, []);

  const handlePhotoFiles = useCallback((files: File[]) => {
    const newFiles: UploadedFile[] = files.map((file) => ({
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setPhotos((prev) => [...prev, ...newFiles]);
  }, []);

  const removeEstimate = (index: number) => {
    setEstimates((prev) => prev.filter((_, i) => i !== index));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (estimates.length === 0) {
      toast.error("Please add at least one adjuster estimate PDF.");
      return;
    }

    setIsUploading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Session expired. Please sign in again.");
      return;
    }

    // Get user's company_id
    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      toast.error("Profile not found.");
      setIsUploading(false);
      return;
    }

    const companyId = profile.company_id;
    const timestamp = Date.now();

    // Upload estimates
    for (let i = 0; i < estimates.length; i++) {
      const item = estimates[i];
      if (item.status === "done") continue;

      setEstimates((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading" as const, progress: 0 } : f
        )
      );

      const filePath = `${companyId}/estimates/${timestamp}_${item.file.name}`;
      const { path, error } = await uploadFile(
        "estimates",
        filePath,
        item.file,
        (progress) => {
          setEstimates((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, progress } : f))
          );
        }
      );

      if (error) {
        setEstimates((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error" as const } : f
          )
        );
        toast.error(`Failed to upload ${item.file.name}: ${error}`);
      } else {
        setEstimates((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "done" as const,
                  progress: 100,
                  storagePath: path,
                }
              : f
          )
        );
      }
    }

    // Upload photos
    for (let i = 0; i < photos.length; i++) {
      const item = photos[i];
      if (item.status === "done") continue;

      setPhotos((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading" as const, progress: 0 } : f
        )
      );

      const filePath = `${companyId}/photos/${timestamp}_${item.file.name}`;
      const { path, error } = await uploadFile(
        "photos",
        filePath,
        item.file,
        (progress) => {
          setPhotos((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, progress } : f))
          );
        }
      );

      if (error) {
        setPhotos((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error" as const } : f
          )
        );
        toast.error(`Failed to upload ${item.file.name}: ${error}`);
      } else {
        setPhotos((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "done" as const,
                  progress: 100,
                  storagePath: path,
                }
              : f
          )
        );
      }
    }

    setIsUploading(false);

    const allEstimatesDone = estimates.every(
      (f) => f.status === "done" || f.status === "error"
    );
    if (allEstimatesDone) {
      toast.success("Files uploaded successfully!");
    }
  };

  const totalFiles = estimates.length + photos.length;
  const doneFiles = [...estimates, ...photos].filter(
    (f) => f.status === "done"
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Estimate</h1>
        <p className="text-muted-foreground">
          Upload the adjuster&apos;s Xactimate estimate and inspection photos to
          generate a supplement.
        </p>
      </div>

      {/* Estimate Upload */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Adjuster Estimate</h2>
          <p className="text-sm text-muted-foreground">
            Upload the PDF estimate from the insurance adjuster. This is the
            Xactimate scope we&apos;ll analyze for missing items.
          </p>
        </div>
        <FileDropzone
          accept=".pdf,application/pdf"
          maxSizeMB={25}
          multiple={false}
          label="Drop the adjuster's PDF estimate here"
          description="PDF files only — this is the Xactimate scope from the carrier"
          icon={
            <svg
              className="h-6 w-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          }
          onFilesSelected={handleEstimateFiles}
        />
        <FileList files={estimates} onRemove={removeEstimate} />
      </div>

      <Separator />

      {/* Photo Upload */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Inspection Photos</h2>
          <p className="text-sm text-muted-foreground">
            Upload photos from the roof inspection. Our AI will analyze them to
            support supplement line items.
          </p>
        </div>
        <FileDropzone
          accept=".jpg,.jpeg,.png,.webp,.heic,image/*"
          maxSizeMB={15}
          multiple={true}
          label="Drop inspection photos here"
          description="JPG, PNG, WEBP — roof damage, materials, components"
          icon={
            <svg
              className="h-6 w-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
          onFilesSelected={handlePhotoFiles}
        />
        <FileList files={photos} onRemove={removePhoto} />
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalFiles === 0
            ? "No files selected"
            : `${totalFiles} file${totalFiles !== 1 ? "s" : ""} selected${
                doneFiles > 0 ? ` — ${doneFiles} uploaded` : ""
              }`}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUploadAll}
            disabled={isUploading || estimates.length === 0}
          >
            {isUploading ? "Uploading..." : "Upload & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
