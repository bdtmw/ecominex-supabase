/** Minimal RFC-4180 CSV writer with spreadsheet-formula-injection protection. */
const needsQuote = /[",\r\n]/;

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = v instanceof Date ? v.toISOString() : String(v);
  // A cell that starts with = + - @ is executed as a formula by Excel/Sheets; prefix it so it is shown as text.
  // (Plain negative numbers are left alone.)
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return needsQuote.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, headers: string[], rows: unknown[][]): Response {
  // BOM so Excel opens UTF-8 names correctly
  return new Response("﻿" + toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.\-]/g, "_")}"`,
      "Cache-Control": "no-store",
    },
  });
}
