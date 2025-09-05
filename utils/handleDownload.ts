import { saveAs } from "file-saver";

export interface DownloadOptions<T extends object> {
  rows: T[] | undefined;
  fileName?: string;
  format?: "csv" | "json";
}

/**
 * Reusable download handler for tables
 */
export function handleDownload<T extends object>({
  rows,
  fileName = "data",
  format = "csv",
}: DownloadOptions<T>) {
  if (!rows || rows.length === 0) {
    alert("No rows selected to download.");
    return;
  }

  if (format === "json") {
    const content = JSON.stringify(rows, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    saveAs(blob, `${fileName}.json`);
    return;
  }

  // ✅ CSV Export
  const headers = Object.keys(rows[0] as T);
  const csvRows = [
    headers.join(","), // header row
    ...rows.map((row) =>
      headers
        .map((field) => JSON.stringify((row as any)[field] ?? ""))
        .join(",")
    ),
  ];
  const content = csvRows.join("\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `${fileName}.csv`);
}
