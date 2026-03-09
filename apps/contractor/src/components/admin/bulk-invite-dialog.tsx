"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { inviteTeamMember } from "@/app/(dashboard)/dashboard/admin/actions";
import { toast } from "sonner";
import { Upload, CheckCircle2, XCircle, FileUp } from "lucide-react";

// ── Types ───────────────────────────────────────────────────

type Step = "upload" | "preview" | "results";

interface ParsedRow {
  email: string;
  role: "user" | "admin";
  valid: boolean;
  error?: string;
}

interface InviteResult {
  email: string;
  role: "user" | "admin";
  success: boolean;
  error?: string;
}

// ── CSV Parsing ─────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = new Set(["user", "admin"]);

function parseCSV(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  // Detect and skip header row
  let startIndex = 0;
  const firstLine = lines[0].toLowerCase();
  if (firstLine.includes("email")) {
    startIndex = 1;
  }

  const rows: ParsedRow[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(",").map((cell) =>
      cell
        .trim()
        .replace(/^["']|["']$/g, "") // strip surrounding quotes
        .trim()
    );

    const email = parts[0]?.toLowerCase() || "";
    const rawRole = parts[1]?.toLowerCase() || "user";
    const role = VALID_ROLES.has(rawRole) ? (rawRole as "user" | "admin") : null;

    // Validate
    if (!email) {
      rows.push({ email: email || "(empty)", role: "user", valid: false, error: "Missing email" });
      continue;
    }

    if (!EMAIL_RE.test(email)) {
      rows.push({ email, role: "user", valid: false, error: "Invalid email format" });
      continue;
    }

    if (!role) {
      rows.push({ email, role: "user", valid: false, error: `Invalid role "${rawRole}" — must be "user" or "admin"` });
      continue;
    }

    rows.push({ email, role, valid: true });
  }

  return rows;
}

// ── Component ───────────────────────────────────────────────

export function BulkInviteDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [results, setResults] = useState<InviteResult[]>([]);
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);

  // Reset state when dialog closes
  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setStep("upload");
      setRows([]);
      setResults([]);
      setSending(false);
      setDragOver(false);
    }
  }, []);

  // Process file contents
  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        toast.error("No data rows found in CSV");
        return;
      }

      setRows(parsed);
      setStep("preview");
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsText(file);
  }, []);

  // File input change handler
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [processFile]
  );

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  // Send all valid invites sequentially
  const handleSendAll = async () => {
    setSending(true);
    const inviteResults: InviteResult[] = [];

    for (const row of validRows) {
      const result = await inviteTeamMember({ email: row.email, role: row.role });

      inviteResults.push({
        email: row.email,
        role: row.role,
        success: !result.error,
        error: result.error ?? undefined,
      });
    }

    setResults(inviteResults);
    setSending(false);
    setStep("results");

    const successCount = inviteResults.filter((r) => r.success).length;
    const failCount = inviteResults.filter((r) => !r.success).length;

    if (failCount === 0) {
      toast.success(`All ${successCount} invites sent successfully`);
    } else {
      toast.warning(`${successCount} sent, ${failCount} failed`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {/* ── Step 1: File Upload ─────────────────────────── */}
        {step === "upload" && (
          <>
            <DialogHeader>
              <DialogTitle>Bulk Import Team Members</DialogTitle>
              <DialogDescription>
                Upload a CSV file to invite multiple team members at once.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed
                  px-6 py-10 text-center cursor-pointer transition-colors
                  ${dragOver ? "border-cyan-500 bg-cyan-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"}
                `}
              >
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-[#344767]">
                    Drop your CSV file here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    .csv files only
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Format instructions */}
              <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                <p className="text-sm font-medium text-[#344767]">
                  Expected format
                </p>
                <p className="text-xs text-muted-foreground">
                  CSV with columns: <strong>email</strong>, <strong>role</strong> (optional, defaults to &quot;user&quot;)
                </p>
                <pre className="mt-2 rounded bg-white border px-3 py-2 text-xs font-mono text-[#344767]">
{`email,role
john@example.com,user
jane@example.com,admin`}
                </pre>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 2: Preview Table ──────────────────────── */}
        {step === "preview" && (
          <>
            <DialogHeader>
              <DialogTitle>Review Invites</DialogTitle>
              <DialogDescription>
                {validRows.length} valid, {invalidRows.length} invalid
                {invalidRows.length > 0 && " — invalid rows will be skipped"}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-72 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow
                      key={idx}
                      className={row.valid ? "" : "bg-red-50"}
                    >
                      <TableCell className="text-sm">{row.email}</TableCell>
                      <TableCell className="text-sm capitalize">
                        {row.role}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {row.valid ? (
                          <span className="text-green-600">Valid</span>
                        ) : (
                          <span className="text-red-600">{row.error}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => {
                  setRows([]);
                  setStep("upload");
                }}
              >
                Back
              </Button>
              <Button
                disabled={validRows.length === 0 || sending}
                onClick={handleSendAll}
              >
                {sending
                  ? `Sending... (${results.length}/${validRows.length})`
                  : `Send ${validRows.length} Invite${validRows.length !== 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 3: Results ────────────────────────────── */}
        {step === "results" && (
          <>
            <DialogHeader>
              <DialogTitle>Import Complete</DialogTitle>
              <DialogDescription>
                {results.filter((r) => r.success).length} invite
                {results.filter((r) => r.success).length !== 1 ? "s" : ""} sent,{" "}
                {results.filter((r) => !r.success).length} failed
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-72 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, idx) => (
                    <TableRow
                      key={idx}
                      className={r.success ? "" : "bg-red-50"}
                    >
                      <TableCell className="text-sm">{r.email}</TableCell>
                      <TableCell className="text-sm capitalize">
                        {r.role}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {r.success ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <XCircle className="h-3.5 w-3.5" />
                            {r.error || "Failed"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
