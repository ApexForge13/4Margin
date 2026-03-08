"use client";

import { useState, useCallback, useEffect, useRef, useTransition } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
  Trash2,
  Play,
  ChevronDown,
  ChevronUp,
  Database,
  Loader2,
  Terminal,
} from "lucide-react";
import type { ColumnInfo } from "./database-actions";
import {
  getTableSchema,
  getTableRows,
  updateCell,
  deleteRow,
  insertRow,
  executeSQL,
} from "./database-actions";

// ── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 50;

const TYPE_COLORS: Record<string, string> = {
  text: "bg-blue-100 text-blue-700",
  "character varying": "bg-blue-100 text-blue-700",
  varchar: "bg-blue-100 text-blue-700",
  integer: "bg-purple-100 text-purple-700",
  int4: "bg-purple-100 text-purple-700",
  int8: "bg-purple-100 text-purple-700",
  bigint: "bg-purple-100 text-purple-700",
  smallint: "bg-purple-100 text-purple-700",
  numeric: "bg-orange-100 text-orange-700",
  "double precision": "bg-orange-100 text-orange-700",
  real: "bg-orange-100 text-orange-700",
  boolean: "bg-green-100 text-green-700",
  bool: "bg-green-100 text-green-700",
  jsonb: "bg-yellow-100 text-yellow-700",
  json: "bg-yellow-100 text-yellow-700",
  uuid: "bg-slate-100 text-slate-600",
  "timestamp with time zone": "bg-cyan-100 text-cyan-700",
  "timestamp without time zone": "bg-cyan-100 text-cyan-700",
  timestamptz: "bg-cyan-100 text-cyan-700",
  timestamp: "bg-cyan-100 text-cyan-700",
  date: "bg-cyan-100 text-cyan-700",
  "ARRAY": "bg-pink-100 text-pink-700",
  "USER-DEFINED": "bg-gray-100 text-gray-600",
};

function getShortType(dataType: string): string {
  const map: Record<string, string> = {
    "character varying": "varchar",
    "timestamp with time zone": "timestamptz",
    "timestamp without time zone": "timestamp",
    "double precision": "float8",
    integer: "int4",
    bigint: "int8",
    smallint: "int2",
    boolean: "bool",
  };
  return map[dataType] || dataType;
}

function isReadOnlyColumn(col: ColumnInfo): boolean {
  const name = col.column_name;
  if (name === "id" && col.data_type === "uuid") return true;
  if (name === "created_at") return true;
  return false;
}

function isNumericType(dataType: string): boolean {
  return [
    "integer",
    "int4",
    "int8",
    "bigint",
    "smallint",
    "numeric",
    "double precision",
    "real",
  ].includes(dataType);
}

function isBoolType(dataType: string): boolean {
  return ["boolean", "bool"].includes(dataType);
}

function isJsonType(dataType: string): boolean {
  return ["jsonb", "json"].includes(dataType);
}

function isTimestampType(dataType: string): boolean {
  return [
    "timestamp with time zone",
    "timestamp without time zone",
    "timestamptz",
    "timestamp",
  ].includes(dataType);
}

// ── Cell Display ─────────────────────────────────────────────

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function truncateDisplay(val: string, max: number = 80): string {
  if (val.length <= max) return val;
  return val.slice(0, max) + "...";
}

// ── Main Component ───────────────────────────────────────────

interface DatabaseTabProps {
  tables: string[];
}

export function DatabaseTab({ tables }: DatabaseTabProps) {
  // Table selection
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination & sorting
  const [page, setPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Loading
  const [isLoading, startTransition] = useTransition();
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);

  // Editing
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    column: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [savedCell, setSavedCell] = useState<{
    rowId: string;
    column: string;
  } | null>(null);

  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRowId, setDeleteRowId] = useState<string>("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});

  // SQL Runner
  const [sqlOpen, setSqlOpen] = useState(false);
  const [sqlQuery, setSqlQuery] = useState("");
  const [sqlMutations, setSqlMutations] = useState(false);
  const [sqlResult, setSqlResult] = useState<Record<string, unknown>[] | null>(
    null
  );
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [isSqlRunning, setIsSqlRunning] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load table data ──────────────────────────────────────

  const loadTableData = useCallback(
    (
      table: string,
      pg: number,
      sortCol?: string,
      sortDir?: "asc" | "desc",
      searchTerm?: string
    ) => {
      startTransition(async () => {
        const result = await getTableRows(table, {
          page: pg,
          pageSize: PAGE_SIZE,
          sortColumn: sortCol,
          sortDirection: sortDir,
          search: searchTerm,
        });
        setRows(result.rows);
        setTotalCount(result.totalCount);
      });
    },
    []
  );

  const handleSelectTable = useCallback(
    async (table: string) => {
      setSelectedTable(table);
      setPage(0);
      setSortColumn(undefined);
      setSortDirection("asc");
      setSearch("");
      setSearchInput("");
      setEditingCell(null);

      setIsLoadingSchema(true);
      const schema = await getTableSchema(table);
      setColumns(schema);
      setIsLoadingSchema(false);

      loadTableData(table, 0);
    },
    [loadTableData]
  );

  // ── Search debounce ──────────────────────────────────────

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(val);
      setPage(0);
      loadTableData(selectedTable, 0, sortColumn, sortDirection, val);
    }, 400);
  };

  // ── Sorting ──────────────────────────────────────────────

  const handleSort = (col: string) => {
    let newDir: "asc" | "desc" = "asc";
    if (sortColumn === col) {
      newDir = sortDirection === "asc" ? "desc" : "asc";
    }
    setSortColumn(col);
    setSortDirection(newDir);
    setPage(0);
    loadTableData(selectedTable, 0, col, newDir, search);
  };

  // ── Pagination ───────────────────────────────────────────

  const handlePrevPage = () => {
    const prev = Math.max(0, page - 1);
    setPage(prev);
    loadTableData(selectedTable, prev, sortColumn, sortDirection, search);
  };

  const handleNextPage = () => {
    const maxPage = Math.ceil(totalCount / PAGE_SIZE) - 1;
    const next = Math.min(maxPage, page + 1);
    setPage(next);
    loadTableData(selectedTable, next, sortColumn, sortDirection, search);
  };

  // ── Inline Editing ───────────────────────────────────────

  const startEditing = (rowId: string, column: string, currentValue: unknown) => {
    const col = columns.find((c) => c.column_name === column);
    if (col && isReadOnlyColumn(col)) return;

    setEditingCell({ rowId, column });
    if (currentValue === null || currentValue === undefined) {
      setEditValue("");
    } else if (typeof currentValue === "object") {
      setEditValue(JSON.stringify(currentValue, null, 2));
    } else {
      setEditValue(String(currentValue));
    }
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const col = columns.find((c) => c.column_name === editingCell.column);
    if (!col) return;

    let parsedValue: unknown = editValue;

    // Parse value based on column type
    if (editValue === "" || editValue === "NULL") {
      parsedValue = null;
    } else if (isNumericType(col.data_type)) {
      parsedValue = Number(editValue);
      if (isNaN(parsedValue as number)) {
        toast.error("Invalid number");
        return;
      }
    } else if (isBoolType(col.data_type)) {
      parsedValue = editValue === "true";
    } else if (isJsonType(col.data_type)) {
      try {
        parsedValue = JSON.parse(editValue);
      } catch {
        toast.error("Invalid JSON");
        return;
      }
    }

    const result = await updateCell(
      selectedTable,
      editingCell.rowId,
      editingCell.column,
      parsedValue
    );

    if (result.error) {
      toast.error(result.error);
    } else {
      // Flash green on save
      setSavedCell({ ...editingCell });
      setTimeout(() => setSavedCell(null), 1000);

      // Update local state
      setRows((prev) =>
        prev.map((r) =>
          (r as Record<string, unknown>).id === editingCell.rowId
            ? { ...r, [editingCell.column]: parsedValue }
            : r
        )
      );
    }

    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  // ── Delete Row ───────────────────────────────────────────

  const handleDeleteClick = (rowId: string) => {
    setDeleteRowId(rowId);
    setDeleteConfirmation("");
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteConfirmation !== "DELETE") return;

    const result = await deleteRow(selectedTable, deleteRowId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Row deleted");
      loadTableData(selectedTable, page, sortColumn, sortDirection, search);
    }
    setDeleteDialogOpen(false);
  };

  // ── Add Row ──────────────────────────────────────────────

  const openAddDialog = () => {
    const initial: Record<string, string> = {};
    for (const col of columns) {
      if (col.column_name === "id" || col.column_name === "created_at") continue;
      initial[col.column_name] = "";
    }
    setNewRowData(initial);
    setAddDialogOpen(true);
  };

  const handleAddRow = async () => {
    const result = await insertRow(selectedTable, newRowData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Row added");
      setAddDialogOpen(false);
      loadTableData(selectedTable, page, sortColumn, sortDirection, search);
    }
  };

  // ── CSV Export ────────────────────────────────────────────

  const handleExportCsv = () => {
    if (rows.length === 0) return;

    const headers = columns.map((c) => c.column_name);
    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return "";
            const str = typeof val === "object" ? JSON.stringify(val) : String(val);
            // Escape CSV values
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedTable}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  // ── SQL Runner ────────────────────────────────────────────

  const handleRunSql = async () => {
    setIsSqlRunning(true);
    setSqlError(null);
    setSqlResult(null);

    const result = await executeSQL(sqlQuery, sqlMutations);

    if (result.error) {
      setSqlError(result.error);
      setSqlResult(null);
    } else {
      setSqlResult(result.rows);
      setSqlError(null);
      if (sqlMutations) {
        // Refresh table data if mutations were allowed
        loadTableData(selectedTable, page, sortColumn, sortDirection, search);
      }
    }

    setIsSqlRunning(false);
  };

  // ── Computed values ──────────────────────────────────────

  const fromRow = page * PAGE_SIZE + 1;
  const toRow = Math.min((page + 1) * PAGE_SIZE, totalCount);
  const maxPage = Math.max(0, Math.ceil(totalCount / PAGE_SIZE) - 1);

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* SQL Query Runner — collapsible */}
      <div className="rounded-2xl border bg-white shadow-soft overflow-hidden">
        <button
          onClick={() => setSqlOpen(!sqlOpen)}
          className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-[#344767] hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            SQL Query Runner
          </div>
          {sqlOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {sqlOpen && (
          <div className="border-t px-5 py-4 space-y-3">
            <Textarea
              placeholder="SELECT * FROM users LIMIT 10;"
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="font-mono text-sm min-h-[100px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleRunSql();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleRunSql}
                  disabled={isSqlRunning || !sqlQuery.trim()}
                  size="sm"
                >
                  {isSqlRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  Execute
                </Button>
                <span className="text-xs text-gray-500">Ctrl/Cmd + Enter</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={sqlMutations}
                  onCheckedChange={setSqlMutations}
                  size="sm"
                />
                <Label className="text-xs text-gray-500 cursor-pointer">
                  Enable mutations
                </Label>
              </div>
            </div>

            {sqlError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-mono">
                {sqlError}
              </div>
            )}

            {sqlResult && sqlResult.length > 0 && (
              <div className="rounded-lg border overflow-hidden max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      {Object.keys(sqlResult[0]).map((key) => (
                        <TableHead key={key} className="text-xs font-semibold text-[#344767]">
                          {key}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sqlResult.map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).map((val, j) => (
                          <TableCell key={j} className="text-xs font-mono">
                            {truncateDisplay(formatCellValue(val), 60)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {sqlResult && sqlResult.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                Query returned no results.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table browser */}
      <div className="rounded-2xl border bg-white shadow-soft overflow-hidden">
        {/* Toolbar */}
        <div className="border-b px-5 py-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Table selector */}
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#344767]" />
              <Select
                value={selectedTable}
                onValueChange={handleSelectTable}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select a table..." />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTable && (
              <>
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-[400px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search across text columns..."
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-auto">
                  <Button variant="outline" size="sm" onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Row
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCsv}
                    disabled={rows.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Row count & pagination info */}
          {selectedTable && totalCount > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Showing {fromRow}–{toRow} of {totalCount.toLocaleString()} rows
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={page === 0}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2">
                  Page {page + 1} of {maxPage + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page >= maxPage}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Data grid */}
        {!selectedTable && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Database className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">Select a table to browse data</p>
          </div>
        )}

        {selectedTable && (isLoading || isLoadingSchema) && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {selectedTable && !isLoading && !isLoadingSchema && columns.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  {columns.map((col) => (
                    <TableHead
                      key={col.column_name}
                      className="cursor-pointer select-none hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort(col.column_name)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#344767]">
                          {col.column_name}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                            TYPE_COLORS[col.data_type] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {getShortType(col.data_type)}
                        </span>
                        {sortColumn === col.column_name ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-[#00BFFF]" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-[#00BFFF]" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-gray-300" />
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + 1}
                      className="text-center py-10 text-gray-400"
                    >
                      No rows found
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => {
                  const rowId = String(
                    (row as Record<string, unknown>).id ?? ""
                  );
                  return (
                    <TableRow key={rowId || JSON.stringify(row)} className="group">
                      {columns.map((col) => {
                        const value = (row as Record<string, unknown>)[
                          col.column_name
                        ];
                        const isEditing =
                          editingCell?.rowId === rowId &&
                          editingCell?.column === col.column_name;
                        const isSaved =
                          savedCell?.rowId === rowId &&
                          savedCell?.column === col.column_name;
                        const readOnly = isReadOnlyColumn(col);

                        return (
                          <TableCell
                            key={col.column_name}
                            className={`text-xs transition-colors ${
                              isSaved
                                ? "bg-green-50"
                                : readOnly
                                ? "bg-gray-50/50"
                                : "cursor-pointer hover:bg-blue-50/50"
                            }`}
                            onClick={() => {
                              if (!isEditing && !readOnly && rowId) {
                                startEditing(rowId, col.column_name, value);
                              }
                            }}
                          >
                            {isEditing ? (
                              <EditCell
                                col={col}
                                value={editValue}
                                onChange={setEditValue}
                                onBlur={saveEdit}
                                onKeyDown={handleKeyDown}
                              />
                            ) : (
                              <span
                                className={`${
                                  value === null
                                    ? "text-gray-300 italic"
                                    : readOnly
                                    ? "text-gray-400 font-mono"
                                    : "text-[#344767]"
                                } ${isJsonType(col.data_type) ? "font-mono" : ""}`}
                              >
                                {truncateDisplay(formatCellValue(value))}
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="w-10">
                        {rowId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                            onClick={() => handleDeleteClick(rowId)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Bottom pagination */}
        {selectedTable && totalCount > PAGE_SIZE && (
          <div className="border-t px-5 py-3 flex items-center justify-between text-xs text-gray-500">
            <span>
              {fromRow}–{toRow} of {totalCount.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevPage}
                disabled={page === 0}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2">
                Page {page + 1} of {maxPage + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextPage}
                disabled={page >= maxPage}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Row</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Type <strong>DELETE</strong> to
              confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder='Type "DELETE" to confirm'
            className="font-mono"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteConfirmation !== "DELETE"}
            >
              Delete Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add row dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Row to {selectedTable}</DialogTitle>
            <DialogDescription>
              Fill in the fields below. Leave blank for NULL. ID and created_at
              are auto-generated.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {columns
              .filter(
                (c) => c.column_name !== "id" && c.column_name !== "created_at"
              )
              .map((col) => (
                <div key={col.column_name} className="grid gap-1.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium text-[#344767]">
                      {col.column_name}
                    </Label>
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                        TYPE_COLORS[col.data_type] ??
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {getShortType(col.data_type)}
                    </span>
                    {col.is_nullable === "YES" && (
                      <span className="text-[10px] text-gray-400">
                        nullable
                      </span>
                    )}
                  </div>
                  {isJsonType(col.data_type) ? (
                    <Textarea
                      value={newRowData[col.column_name] ?? ""}
                      onChange={(e) =>
                        setNewRowData((prev) => ({
                          ...prev,
                          [col.column_name]: e.target.value,
                        }))
                      }
                      placeholder="JSON..."
                      className="font-mono text-xs min-h-[60px]"
                    />
                  ) : isBoolType(col.data_type) ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newRowData[col.column_name] === "true"}
                        onCheckedChange={(checked) =>
                          setNewRowData((prev) => ({
                            ...prev,
                            [col.column_name]: String(checked),
                          }))
                        }
                        size="sm"
                      />
                      <span className="text-xs text-gray-500">
                        {newRowData[col.column_name] === "true"
                          ? "true"
                          : "false"}
                      </span>
                    </div>
                  ) : (
                    <Input
                      type={
                        isNumericType(col.data_type)
                          ? "number"
                          : isTimestampType(col.data_type)
                          ? "datetime-local"
                          : "text"
                      }
                      value={newRowData[col.column_name] ?? ""}
                      onChange={(e) =>
                        setNewRowData((prev) => ({
                          ...prev,
                          [col.column_name]: e.target.value,
                        }))
                      }
                      placeholder={
                        col.column_default
                          ? `Default: ${col.column_default}`
                          : col.is_nullable === "YES"
                          ? "NULL"
                          : "required"
                      }
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRow}>
              <Plus className="h-4 w-4 mr-1" />
              Insert Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── EditCell sub-component ───────────────────────────────────

function EditCell({
  col,
  value,
  onChange,
  onBlur,
  onKeyDown,
}: {
  col: ColumnInfo;
  value: string;
  onChange: (val: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (inputRef.current instanceof HTMLInputElement) {
      inputRef.current.select();
    }
  }, []);

  if (isBoolType(col.data_type)) {
    return (
      <div className="flex items-center gap-2">
        <Switch
          checked={value === "true"}
          onCheckedChange={(checked) => {
            onChange(String(checked));
            // Auto-save on toggle
            setTimeout(onBlur, 0);
          }}
          size="sm"
        />
        <span className="text-xs">{value === "true" ? "true" : "false"}</span>
      </div>
    );
  }

  if (isJsonType(col.data_type)) {
    return (
      <Textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="font-mono text-xs min-h-[60px] w-full"
      />
    );
  }

  return (
    <Input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={
        isNumericType(col.data_type)
          ? "number"
          : isTimestampType(col.data_type)
          ? "datetime-local"
          : "text"
      }
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className="h-7 text-xs"
    />
  );
}
