"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────

interface CompanyDocument {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

interface DocumentLibraryProps {
  documents: CompanyDocument[];
  companyId: string;
}

// ── Category config ───────────────────────────────────────────

const CATEGORIES: Record<string, string> = {
  authorization: "Authorization Forms",
  contracts: "Contracts",
  licenses: "Licenses & Certifications",
  financial: "Financial (W-9, COI)",
  lien_waivers: "Lien Waivers",
  other: "Other",
};

const CATEGORY_KEYS = Object.keys(CATEGORIES);

const ACCEPTED_TYPES =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// ── Helpers ───────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ── Icons (inline SVGs) ──────────────────────────────────────

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ChevronIcon({
  className,
  open,
}: {
  className?: string;
  open: boolean;
}) {
  return (
    <svg
      className={`${className ?? ""} transition-transform ${open ? "rotate-90" : ""}`}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────

export function DocumentLibrary({
  documents,
  companyId,
}: DocumentLibraryProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadCategory, setUploadCategory] = useState("other");
  const [uploading, setUploading] = useState(false);

  // UI state
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >(() => {
    // Default: expand categories that have documents
    const initial: Record<string, boolean> = {};
    for (const key of CATEGORY_KEYS) {
      initial[key] = documents.some((d) => d.category === key);
    }
    return initial;
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Group documents by category
  const grouped: Record<string, CompanyDocument[]> = {};
  for (const key of CATEGORY_KEYS) {
    grouped[key] = documents.filter((d) => d.category === key);
  }

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── File selection ───────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be under 20 MB.");
      return;
    }

    setSelectedFile(file);
    if (!uploadName) {
      // Default name to filename without extension
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setUploadName(nameWithoutExt);
    }
    // Reset the input so re-selecting the same file works
    e.target.value = "";
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setUploadName("");
    setUploadDesc("");
    setUploadCategory("other");
  };

  // ── Upload ──────────────────────────────────────────────

  const handleUpload = async () => {
    if (!selectedFile) return;

    const name = uploadName.trim() || selectedFile.name;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", name);
      formData.append("description", uploadDesc.trim());
      formData.append("category", uploadCategory);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Upload failed");
      }

      toast.success("Document uploaded.");
      clearSelection();
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  // ── Download ────────────────────────────────────────────

  const handleDownload = async (doc: CompanyDocument) => {
    setDownloading(doc.id);
    try {
      const res = await fetch(
        `/api/documents?id=${doc.id}&action=download`
      );
      if (!res.ok) {
        throw new Error("Failed to get download link");
      }
      const { url } = await res.json();
      // Open signed URL in new tab
      window.open(url, "_blank");
    } catch {
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  // ── Delete ──────────────────────────────────────────────

  const handleDelete = async (docId: string) => {
    setDeleting(docId);
    try {
      const res = await fetch(`/api/documents?id=${docId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Delete failed");
      }

      toast.success("Document deleted.");
      setDeleteConfirm(null);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Delete failed. Please try again."
      );
    } finally {
      setDeleting(null);
    }
  };

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "#344767" }}
        >
          Document Library
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#94a3b8" }}>
          Upload and manage company documents — authorization forms, contracts,
          licenses, and more.
        </p>
      </div>

      {/* Upload Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2
          className="mb-4 text-lg font-semibold"
          style={{ color: "#344767" }}
        >
          Upload Document
        </h2>

        {!selectedFile ? (
          /* Drop zone / file picker */
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 transition-colors hover:border-[#00BFFF]/40 hover:bg-slate-50"
          >
            <UploadIcon className="mb-2 h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-500">
              Click to browse for a file
            </p>
            <p className="mt-1 text-xs text-slate-400">
              PDF, DOC, DOCX, JPG, PNG, XLS, XLSX &mdash; max 20 MB
            </p>
          </button>
        ) : (
          /* Selected file form */
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <FileIcon className="h-5 w-5 flex-shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Name + Category row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">
                  Document Name
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Authorization to Represent"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-[#00BFFF] focus:ring-1 focus:ring-[#00BFFF]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-[#00BFFF] focus:ring-1 focus:ring-[#00BFFF]/30"
                >
                  {CATEGORY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {CATEGORIES[key]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Description{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                placeholder="Brief description of this document"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-[#00BFFF] focus:ring-1 focus:ring-[#00BFFF]/30"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#00BFFF" }}
              >
                <UploadIcon className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload"}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={uploading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Document list by category */}
      <div className="space-y-3">
        {CATEGORY_KEYS.map((catKey) => {
          const catDocs = grouped[catKey];
          const isOpen = expandedCategories[catKey] ?? false;

          return (
            <div
              key={catKey}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(catKey)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/80"
              >
                <ChevronIcon
                  className="h-4 w-4 text-slate-400"
                  open={isOpen}
                />
                <FolderIcon className="h-5 w-5 text-slate-400" />
                <span
                  className="flex-1 text-sm font-semibold"
                  style={{ color: "#344767" }}
                >
                  {CATEGORIES[catKey]}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                  {catDocs.length}
                </span>
              </button>

              {/* Documents list */}
              {isOpen && (
                <div className="border-t border-slate-100">
                  {catDocs.length === 0 ? (
                    <p className="px-5 py-6 text-center text-sm text-slate-400">
                      No documents in this category yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {catDocs.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex items-center gap-4 px-5 py-3"
                        >
                          <FileIcon className="h-5 w-5 flex-shrink-0 text-slate-300" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-700">
                              {doc.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              {doc.description && (
                                <>
                                  <span className="truncate">
                                    {doc.description}
                                  </span>
                                  <span>·</span>
                                </>
                              )}
                              <span>{timeAgo(doc.created_at)}</span>
                              <span>·</span>
                              <span>{formatFileSize(doc.file_size)}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            {/* Download */}
                            <button
                              type="button"
                              onClick={() => handleDownload(doc)}
                              disabled={downloading === doc.id}
                              title="Download"
                              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                            >
                              <DownloadIcon className="h-4 w-4" />
                            </button>

                            {/* Delete */}
                            {deleteConfirm === doc.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(doc.id)}
                                  disabled={deleting === doc.id}
                                  className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                                >
                                  {deleting === doc.id
                                    ? "Deleting..."
                                    : "Confirm"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm(null)}
                                  className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(doc.id)}
                                title="Delete"
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
