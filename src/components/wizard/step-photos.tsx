"use client";

import { useCallback } from "react";
import { useWizard } from "./wizard-context";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { PhotoFile } from "@/types/wizard";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function StepPhotos() {
  const { state, dispatch, nextStep, prevStep } = useWizard();

  const handlePhotoFiles = useCallback(
    (files: File[]) => {
      const newPhotos: PhotoFile[] = files.map((file) => ({
        file,
        note: "",
        previewUrl: URL.createObjectURL(file),
      }));
      dispatch({ type: "ADD_PHOTOS", photos: newPhotos });
    },
    [dispatch]
  );

  return (
    <div className="space-y-8">
      {/* Photo Upload */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">
            Inspection Photos
            <span className="ml-2 text-xs font-medium text-muted-foreground uppercase">
              Optional
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload photos from the roof inspection. Add notes to each photo to
            help our AI understand what it&apos;s looking at and support your
            supplement request.
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
      </div>

      {/* Photo Grid with Notes */}
      {state.photos.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-medium">
              {state.photos.length} photo{state.photos.length !== 1 ? "s" : ""}{" "}
              added
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {state.photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative rounded-lg border bg-white overflow-hidden"
                >
                  {/* Remove button */}
                  <button
                    onClick={() =>
                      dispatch({ type: "REMOVE_PHOTO", index })
                    }
                    className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    aria-label={`Remove ${photo.file.name}`}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>

                  {/* Thumbnail */}
                  <div className="aspect-[4/3] bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.previewUrl}
                      alt={photo.file.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* File info + note */}
                  <div className="p-3 space-y-2">
                    <div>
                      <p className="text-sm font-medium truncate">
                        {photo.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(photo.file.size)}
                      </p>
                    </div>
                    <Textarea
                      placeholder="Describe what this photo shows... (e.g. missing drip edge on north side)"
                      value={photo.note}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_PHOTO_NOTE",
                          index,
                          note: e.target.value,
                        })
                      }
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={nextStep}>Next: Measurements</Button>
      </div>
    </div>
  );
}
