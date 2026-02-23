"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadCarrierResponse } from "@/app/(dashboard)/dashboard/actions";

interface CarrierUploadCardProps {
  supplementId: string;
  existingResponseUrl?: string | null;
}

export function CarrierUploadCard({
  supplementId,
}: CarrierUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadCarrierResponse(supplementId, formData);
    setUploading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Carrier response uploaded.");
      setFile(null);
    }
  };

  return (
    <Card className="border-2 border-amber-300 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            className="h-5 w-5 text-amber-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Upload Carrier Response
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Have you received the carrier&apos;s response? Upload their final
          estimate, approval letter, or denial explanation. This data helps
          improve future supplement accuracy.
        </p>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-amber-300 p-4 transition-colors hover:border-amber-500 hover:bg-amber-50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-5 w-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            {file ? (
              <p className="text-sm font-medium truncate">{file.name}</p>
            ) : (
              <p className="text-sm font-medium text-amber-700">
                Click to upload PDF or image
              </p>
            )}
          </div>
          <input
            type="file"
            className="sr-only"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        {file && (
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? "Uploading..." : "Upload Response"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
