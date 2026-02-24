"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

interface FileDropzoneProps {
  accept: string;
  maxSizeMB?: number;
  multiple?: boolean;
  label: string;
  description: string;
  icon: React.ReactNode;
  onFilesSelected: (files: File[]) => void;
}

export function FileDropzone({
  accept,
  maxSizeMB = 25,
  multiple = true,
  label,
  description,
  icon,
  onFilesSelected,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFiles = useCallback(
    (files: FileList | File[]): File[] => {
      const maxBytes = maxSizeMB * 1024 * 1024;
      const acceptTypes = accept.split(",").map((t) => t.trim());
      const valid: File[] = [];

      Array.from(files).forEach((file) => {
        if (file.size > maxBytes) return;

        const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
        const matchesType = acceptTypes.some(
          (type) =>
            type === fileExt ||
            type === file.type ||
            (type.endsWith("/*") &&
              file.type.startsWith(type.replace("/*", "/")))
        );

        if (matchesType) {
          valid.push(file);
        }
      });

      return valid;
    },
    [accept, maxSizeMB]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const validFiles = validateFiles(e.dataTransfer.files);
        if (validFiles.length > 0) {
          onFilesSelected(validFiles);
        }
        e.dataTransfer.clearData();
      }
    },
    [validateFiles, onFilesSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const validFiles = validateFiles(e.target.files);
        if (validFiles.length > 0) {
          onFilesSelected(validFiles);
        }
      }
      // Reset so same file can be selected again
      e.target.value = "";
    },
    [validateFiles, onFilesSelected]
  );

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed px-4 py-4 text-center transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-gray-300 hover:border-gray-400"
      }`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <div className="mx-auto flex items-center justify-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          {icon}
        </div>
        <div className="text-left min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <label className="shrink-0">
          <Button variant="outline" size="sm" asChild>
            <span>Browse</span>
          </Button>
          <input
            type="file"
            className="sr-only"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInput}
          />
        </label>
      </div>
    </div>
  );
}
