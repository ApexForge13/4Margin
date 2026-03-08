"use server";

import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ────────────────────────────────────────────────────

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

// ── Helpers ──────────────────────────────────────────────────

/** Only allow alphanumeric + underscore table/column names to prevent SQL injection */
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "");
}

function isValidName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Execute raw SQL via the exec_sql RPC function.
 * Requires migration 033_exec_sql_function.sql to be applied.
 */
async function execSql(query: string): Promise<{ data: unknown; error: string | null }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("exec_sql", { query });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ── List Tables ──────────────────────────────────────────────

export async function listTables(): Promise<string[]> {
  const result = await execSql(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  if (result.error) {
    console.error("Failed to list tables:", result.error);
    return [];
  }

  return ((result.data as Array<{ table_name: string }>) ?? []).map(
    (r) => r.table_name
  );
}

// ── Table Schema ─────────────────────────────────────────────

export async function getTableSchema(
  tableName: string
): Promise<ColumnInfo[]> {
  if (!isValidName(tableName)) return [];
  const safe = sanitizeName(tableName);

  const result = await execSql(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${safe}'
    ORDER BY ordinal_position
  `);

  if (result.error) {
    console.error("Failed to get schema:", result.error);
    return [];
  }

  return (result.data as ColumnInfo[]) ?? [];
}

// ── Paginated Rows ───────────────────────────────────────────

export async function getTableRows(
  tableName: string,
  options: {
    page: number;
    pageSize: number;
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
    search?: string;
  }
): Promise<{ rows: Record<string, unknown>[]; totalCount: number }> {
  if (!isValidName(tableName))
    return { rows: [], totalCount: 0 };

  const admin = createAdminClient();
  const { page, pageSize, sortColumn, sortDirection, search } = options;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from(tableName)
    .select("*", { count: "exact" });

  // Apply search filter — search across text-like columns
  if (search && search.trim()) {
    const schema = await getTableSchema(tableName);
    const textCols = schema.filter((c) =>
      ["text", "character varying", "varchar", "char", "name", "uuid"].includes(
        c.data_type
      )
    );

    if (textCols.length > 0) {
      const escaped = search.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
      const orFilter = textCols
        .map((c) => `${sanitizeName(c.column_name)}.ilike.%${escaped}%`)
        .join(",");
      query = query.or(orFilter);
    }
  }

  // Apply sort
  if (sortColumn && isValidName(sortColumn)) {
    query = query.order(sanitizeName(sortColumn), {
      ascending: sortDirection !== "desc",
    });
  } else {
    // Default: try created_at desc, Supabase will error-fall-through if missing
    query = query.order("created_at", { ascending: false });
  }

  // Apply pagination
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    // If default sort by created_at fails, retry without sort
    if (error.message.includes("created_at")) {
      const retryQuery = admin
        .from(tableName)
        .select("*", { count: "exact" })
        .range(from, to);
      const retry = await retryQuery;
      if (!retry.error) {
        return {
          rows: (retry.data as Record<string, unknown>[]) ?? [],
          totalCount: retry.count ?? 0,
        };
      }
    }
    console.error("Failed to fetch rows:", error.message);
    return { rows: [], totalCount: 0 };
  }

  return {
    rows: (data as Record<string, unknown>[]) ?? [],
    totalCount: count ?? 0,
  };
}

// ── Update Cell ──────────────────────────────────────────────

export async function updateCell(
  tableName: string,
  rowId: string,
  column: string,
  value: unknown
): Promise<{ error: string | null }> {
  if (!isValidName(tableName) || !isValidName(column))
    return { error: "Invalid table or column name." };

  const admin = createAdminClient();
  const { error } = await admin
    .from(tableName)
    .update({ [sanitizeName(column)]: value })
    .eq("id", rowId);

  if (error) return { error: error.message };
  return { error: null };
}

// ── Delete Row ───────────────────────────────────────────────

export async function deleteRow(
  tableName: string,
  rowId: string
): Promise<{ error: string | null }> {
  if (!isValidName(tableName))
    return { error: "Invalid table name." };

  const admin = createAdminClient();
  const { error } = await admin
    .from(tableName)
    .delete()
    .eq("id", rowId);

  if (error) return { error: error.message };
  return { error: null };
}

// ── Insert Row ───────────────────────────────────────────────

export async function insertRow(
  tableName: string,
  data: Record<string, unknown>
): Promise<{ error: string | null }> {
  if (!isValidName(tableName))
    return { error: "Invalid table name." };

  // Sanitize all column names in the data
  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (isValidName(key)) {
      sanitized[sanitizeName(key)] = val === "" ? null : val;
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from(tableName).insert(sanitized);

  if (error) return { error: error.message };
  return { error: null };
}

// ── Execute SQL ──────────────────────────────────────────────

export async function executeSQL(
  sql: string,
  allowMutations: boolean
): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  const trimmed = sql.trim();

  if (!trimmed) return { rows: [], error: "Empty query." };

  // Safety check: only allow SELECT unless mutations are enabled
  if (!allowMutations) {
    const upper = trimmed.toUpperCase();
    const firstWord = upper.split(/\s+/)[0];
    const allowed = ["SELECT", "WITH", "EXPLAIN"];
    if (!allowed.includes(firstWord)) {
      return {
        rows: [],
        error:
          "Only SELECT queries allowed. Enable mutations to run INSERT, UPDATE, DELETE.",
      };
    }

    // Block dangerous keywords even within CTEs
    const dangerous = [
      "INSERT",
      "UPDATE",
      "DELETE",
      "DROP",
      "ALTER",
      "TRUNCATE",
      "CREATE",
      "GRANT",
      "REVOKE",
    ];
    for (const kw of dangerous) {
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      if (regex.test(trimmed)) {
        return {
          rows: [],
          error: `Query contains ${kw} — enable mutations to run this query.`,
        };
      }
    }
  }

  const result = await execSql(trimmed);

  if (result.error) {
    return { rows: [], error: result.error };
  }

  return { rows: (result.data as Record<string, unknown>[]) ?? [] };
}
