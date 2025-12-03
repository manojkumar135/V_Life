import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

import ShowToast from "@/components/common/Toast/toast";

export interface DownloadOptions<T extends object> {
  rows: T[] | undefined;
  fileName?: string;
  format?: "csv" | "json" | "xlsx";
  excludeHeaders?: string[];
  onStart?: () => void;
  onFinish?: () => void;
}

function formatHeader(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function handleDownload<T extends object>({
  rows,
  fileName = "data",
  format = "xlsx",
  excludeHeaders = [],
  onStart,
  onFinish,
}: DownloadOptions<T>) {
  if (!rows || rows.length === 0) {
    ShowToast.error("No rows selected to download.");
    return;
  }

  onStart?.();

  try {
    if (format === "json") {
      const sanitized = rows.map((row) => {
        const copy: any = { ...row };
        excludeHeaders.forEach((h) => delete copy[h]);
        return copy;
      });

      const content = JSON.stringify(sanitized, null, 2);
      const blob = new Blob([content], { type: "application/json" });
      saveAs(blob, `${fileName}.json`);

      ShowToast.success("JSON file downloaded successfully ✅");
      return;
    }

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet1");

      // Filter + format headers
      const allHeaders = Object.keys(rows[0] as T);
      const headers = allHeaders.filter((h) => !excludeHeaders.includes(h));
      const formattedHeaders = headers.map(formatHeader);

      // Add header row
      const headerRow = worksheet.addRow(formattedHeaders);

      // Style header
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "106187" },
        };
        cell.font = { bold: true, color: { argb: "ffffff" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      // Add data rows
      rows.forEach((row) => {
        worksheet.addRow(headers.map((field) => (row as any)[field] ?? ""));
      });

      // Auto column widths
      worksheet.columns.forEach((col) => {
        if (!col) return;
        let maxLength = 0;
        col.eachCell?.({ includeEmpty: true }, (cell) => {
          maxLength = Math.max(maxLength, cell.value?.toString().length || 0);
        });
        col.width = Math.max(20, maxLength + 2);
      });

      // Write and save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, `${fileName}.xlsx`);

      ShowToast.success("File downloaded successfully ✅");
      return;
    }

    // Fallback CSV
    const allHeaders = Object.keys(rows[0] as T);
    const headers = allHeaders.filter((h) => !excludeHeaders.includes(h));
    const formattedHeaders = headers.map(formatHeader);

    const csvRows = [
      formattedHeaders.join(","),
      ...rows.map((row) =>
        headers
          .map((field) => JSON.stringify((row as any)[field] ?? ""))
          .join(",")
      ),
    ];
    const content = csvRows.join("\n");

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${fileName}.csv`);

    ShowToast.success("CSV file downloaded successfully ✅");
  } catch (err) {
    console.error("Download failed:", err);
    ShowToast.error("Failed to download file. Please try again.");
  } finally {
    onFinish?.();
  }
}
