/** Saves rows as a spreadsheet file (CSV that opens in Excel, with Hindi and Telugu names intact). */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]): void {
  const cell = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/\s+/g, " ").trim().replace(/"/g, '""')}"`;
  const body = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
