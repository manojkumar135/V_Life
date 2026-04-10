//utils/server/handleIDFCDownload.ts

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import ShowToast from "@/components/common/Toast/toast";

export interface IDFCDownloadOptions {
  rows: any[];
  fileName?: string;
  /** Your company's IDFC FIRST Bank debit account number */
  debitAccountNumber?: string;
  onStart?: () => void;
  onFinish?: () => void;
}

/**
 * Generates an IDFC FIRST Bank bulk payment upload Excel file.
 *
 * Format (matches idfc_excel_format.xlsx exactly):
 *   Row 1 — Column headers (15 columns)
 *   Row 2 — Instructions / field descriptions
 *   Row 3+ — Actual payment data rows
 *
 * Columns:
 *   Beneficiary Name | Beneficiary Account Number | IFSC |
 *   Transaction Type | Debit Account Number | Transaction Date |
 *   Amount | Currency | Beneficiary Email ID | Remarks |
 *   Custom Header – 1 | Custom Header – 2 | Custom Header – 3 |
 *   Custom Header – 4 | Custom Header – 5
 */
export async function handleIDFCDownload({
  rows,
  fileName = "idfc_payout_upload",
  debitAccountNumber = "10269542603",
  onStart,
  onFinish,
}: IDFCDownloadOptions) {
  if (!rows || rows.length === 0) {
    ShowToast.error("No rows to download.");
    return;
  }

  onStart?.();

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet1");

    /* ── Row 1: Exact IDFC column headers ─────────────────────── */
    const headers = [
      "Beneficiary Name",
      "Beneficiary Account Number",
      "IFSC",
      "Transaction Type",
      "Debit Account Number",
      "Transaction Date",
      "Amount",
      "Currency",
      "Beneficiary Email ID",
      "Remarks",
      "Custom Header – 1",
      "Custom Header – 2",
      "Custom Header – 3",
      "Custom Header – 4",
      "Custom Header – 5",
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F497D" }, // dark navy — matches IDFC template
      };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: false,
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFAAAAAA" } },
      };
    });
    headerRow.height = 20;

    /* ── Row 2: IDFC field instructions (matches template exactly) */
    const instructions = [
      "Enter beneficiary name.\nMANDATORY",
      "Enter beneficiary account number. \nThis can be IDFC FIRST Bank account or other Bank account.\nMANDATORY",
      "Enter beneficiary bank IFSC code. Required only for Inter bank (NEFT/RTGS) payment.",
      "Enter payment type:\nIFT - Within Bank payment\nNEFT - Inter-Bank(NEFT) payment\nRTGS - Inter-Bank(RTGS) payment\nMANDATORY",
      "Enter debit account number. This should be IDFC FIRST Bank account only. User should have access to do transaction on this account",
      "Enter transaction value date. Should be today's date or future date.\nMANDATORY\nDD/MM/YYYY format",
      "Enter payment amount.\nMANDATORY",
      "Enter transaction currency. Should be INR only.\nMANDATORY",
      "Enter beneficiary email id\nOPTIONAL",
      "Enter remarks\nOPTIONAL",
      "Credit Advice:\nEnter Custom Info -1\nNote: Header label is editable in Row 1\nOPTIONAL",
      "Credit Advice:\nEnter Custom Info -2\nNote: Header label is editable in Row 1\nOPTIONAL",
      "Credit Advice:\nEnter Custom Info -3\nNote: Header label is editable in Row 1\nOPTIONAL",
      "Credit Advice:\nEnter Custom Info -4\nNote: Header label is editable in Row 1\nOPTIONAL",
      "Credit Advice:\nEnter Custom Info -5\nNote: Header label is editable in Row 1\nOPTIONAL",
    ];

    const instrRow = worksheet.addRow(instructions);
    instrRow.eachCell((cell) => {
      cell.font = { size: 9, color: { argb: "FF595959" }, italic: true };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF2CC" }, // light yellow — matches IDFC template
      };
    });
    instrRow.height = 72;

    /* ── Rows 3+: Payment data ─────────────────────────────────── */
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const todayFormatted = `${dd}/${mm}/${yyyy}`; // DD/MM/YYYY as required by IDFC

    for (const row of rows) {
      const amount = Number(row.total_release ?? 0);
      if (amount <= 0) continue; // skip zero-amount rows

      const dataRow = worksheet.addRow([
        row.account_holder_name || row.user_name || "", // Beneficiary Name          — bank-registered name, MANDATORY
        row.account_number || "", // Beneficiary Account Number — MANDATORY
        row.ifsc_code || "", // IFSC                       — MANDATORY for NEFT/RTGS
        "NEFT", // Transaction Type           — MANDATORY
        debitAccountNumber, // Debit Account Number       — fill via env or setting
        todayFormatted, // Transaction Date           — DD/MM/YYYY MANDATORY
        amount, // Amount                     — MANDATORY
        "INR", // Currency                   — MANDATORY
        row.mail || "", // Beneficiary Email ID       — OPTIONAL
        `Payout - ${row.user_id}`, // Remarks                    — OPTIONAL
        row.user_id || "", // Custom Header – 1 (User ID)
        row.contact || "", // Custom Header – 2 (Contact — from wallet)
        "", // Custom Header – 3 (PAN)
        "", // Custom Header – 4
        "", // Custom Header – 5
      ]);

      // Style amount cell as number
      const amountCell = dataRow.getCell(7); // column G = Amount
      amountCell.numFmt = "#,##0.00";
      amountCell.alignment = { horizontal: "right" };

      // Alternate row shading for readability
      const isEven = (dataRow.number - 2) % 2 === 0;
      dataRow.eachCell((cell, colNumber) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isEven ? "FFFAFAFA" : "FFFFFFFF" },
        };
        cell.font = { size: 10 };
        cell.alignment = cell.alignment || { vertical: "middle" };
        cell.border = {
          bottom: { style: "hair", color: { argb: "FFE0E0E0" } },
        };
      });

      dataRow.height = 18;
    }

    /* ── Column widths (tuned to IDFC template proportions) ────── */
    const colWidths = [
      22, 26, 14, 16, 24, 14, 12, 10, 28, 24, 16, 16, 16, 14, 14,
    ];
    worksheet.columns.forEach((col, i) => {
      if (col) col.width = colWidths[i] ?? 15;
    });

    /* ── Freeze top 2 rows so header + instructions stay visible ─ */
    worksheet.views = [{ state: "frozen", ySplit: 2 }];

    /* ── Write and save ────────────────────────────────────────── */
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `${fileName}.xlsx`);

    ShowToast.success("IDFC payment file downloaded successfully ✅");
  } catch (err) {
    console.error("IDFC download failed:", err);
    ShowToast.error("Failed to generate IDFC file. Please try again.");
  } finally {
    onFinish?.();
  }
}
