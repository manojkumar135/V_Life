/**
 * GET /api/payrelease/batches/[batchId]/excel/route.ts
 *
 * Re-generates the NEFT Excel file for an already-released batch.
 * Reads from Withdraw collection — NO DB writes whatsoever.
 *
 * Excel layout now matches handleIDFCDownload.ts exactly:
 *   Row 1  — Column headers  (15 IDFC columns, dark-navy fill)
 *   Row 2  — Field instructions  (light-yellow fill, wrapped text)
 *   Row 3+ — Actual payment data rows  (alternating shading)
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Withdraw } from "@/models/withdraw";
import { PayoutBatch } from "@/models/batch";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayDDMMYYYY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ─── Excel builder — IDFC format ──────────────────────────────────────────────

async function buildExcel(
  withdraws: any[],
  batchId: string,
  releaseDate: string,
): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");

  // ── Row 1: Exact IDFC column headers ──────────────────────────────────────
  const HEADERS = [
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

  const headerRow = ws.addRow(HEADERS);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F497D" }, // dark navy — matches IDFC template
    };
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 10,
      name: "Arial",
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: false,
    };
    cell.border = { bottom: { style: "thin", color: { argb: "FFAAAAAA" } } };
  });
  headerRow.height = 20;

  // ── Row 2: IDFC field instructions ────────────────────────────────────────
  const INSTRUCTIONS = [
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

  const instrRow = ws.addRow(INSTRUCTIONS);
  instrRow.eachCell((cell) => {
    cell.font = {
      size: 9,
      color: { argb: "FF595959" },
      italic: true,
      name: "Arial",
    };
    cell.alignment = { vertical: "top", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF2CC" }, // light yellow — matches IDFC template
    };
  });
  instrRow.height = 72;

  // ── Collapse withdraw records to one row per user ─────────────────────────
  const userMap = new Map<string, any>();

  for (const w of withdraws) {
    if (!userMap.has(w.user_id)) {
      userMap.set(w.user_id, {
        user_id: w.user_id,
        user_name: w.user_name,
        account_holder_name: w.account_holder_name,
        contact: w.contact,
        pan_number: w.pan_number,
        bank_name: w.bank_name,
        account_number: w.account_number,
        ifsc_code: w.ifsc_code,
        mail: w.mail || "",
        payout_names: new Set<string>(),
        bonus_types: new Set<string>(),
        original_total: 0,
        tds_total: 0,
        admin_total: 0,
        released_total: 0,
        neft_utr: w.neft_utr || "",
        neft_date: w.neft_transaction_date || "",
      });
    }
    const u = userMap.get(w.user_id)!;
    u.payout_names.add(w.payout_name || "");
    u.bonus_types.add(w.bonus_type || "");
    u.original_total += w.original_amount || 0;
    u.tds_total += w.tds_amount || 0;
    u.admin_total += w.admin_charge || 0;
    u.released_total += w.released_amount || 0;
    if (w.neft_utr && !u.neft_utr) u.neft_utr = w.neft_utr;
    if (w.neft_transaction_date && !u.neft_date)
      u.neft_date = w.neft_transaction_date;
  }

  const rows = Array.from(userMap.values())
    .filter((r) => r.released_total > 0) // skip zero-amount rows (matches IDFC handler)
    .sort((a, b) => b.released_total - a.released_total);

  // ── Rows 3+: Payment data ─────────────────────────────────────────────────
  const debitAccountNumber = process.env.IDFC_DEBIT_ACCOUNT_NUMBER ?? "";
  const txDate = releaseDate || todayDDMMYYYY();

  rows.forEach((r, i) => {
    const dataRow = ws.addRow([
      r.account_holder_name || r.user_name || "", // Beneficiary Name          — MANDATORY
      r.account_number || "", // Beneficiary Account Number — MANDATORY
      r.ifsc_code || "", // IFSC                       — MANDATORY for NEFT
      "NEFT", // Transaction Type           — MANDATORY
      "10269542603", // Debit Account Number
      txDate, // Transaction Date           — DD/MM/YYYY MANDATORY
      r.released_total, // Amount                     — MANDATORY
      "INR", // Currency                   — MANDATORY
      r.mail || "", // Beneficiary Email ID       — OPTIONAL
      "", // Remarks                    — OPTIONAL
      r.user_id || "", // Custom Header – 1 (User ID)
      r.contact || "", // Custom Header – 2 (Contact)
      "", // Custom Header – 3 (PAN)
      "", // Custom Header – 4 (Payout names)
      "", // Custom Header – 5 (Bonus types)
    ]);

    // Amount cell — number format, right-aligned (column G = index 7)
    const amountCell = dataRow.getCell(7);
    amountCell.numFmt = `"₹"#,##0.00`;
    amountCell.alignment = { horizontal: "right" };

    // Alternate row shading — same logic as IDFC handler
    const isEven = (dataRow.number - 2) % 2 === 0;
    dataRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFFAFAFA" : "FFFFFFFF" },
      };
      cell.font = { size: 10, name: "Arial" };
      cell.alignment = cell.alignment || { vertical: "middle" };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE0E0E0" } } };
    });

    dataRow.height = 18;
  });

  // ── Column widths — tuned to IDFC template proportions ───────────────────
  const COL_WIDTHS = [
    22, 26, 14, 16, 24, 14, 12, 10, 28, 24, 16, 16, 16, 14, 14,
  ];
  ws.columns.forEach((col, i) => {
    if (col) col.width = COL_WIDTHS[i] ?? 15;
  });

  // ── Freeze top 2 rows so header + instructions stay visible ──────────────
  ws.views = [{ state: "frozen", ySplit: 2 }];

  return (await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    await connectDB();
    const { batchId } = await params;

    // Verify batch exists
    const batch = (await PayoutBatch.findOne({
      batch_id: batchId,
    }).lean()) as any;
    if (!batch) {
      return NextResponse.json(
        { success: false, message: "Batch not found" },
        { status: 404 },
      );
    }

    // Fetch all withdraw records for this batch — READ ONLY, no DB writes
    const withdraws = await Withdraw.find({ batch_id: batchId })
      .sort({ user_id: 1, bonus_type: 1 })
      .lean();

    if (!withdraws.length) {
      return NextResponse.json(
        { success: false, message: "No withdraw records found for this batch" },
        { status: 404 },
      );
    }

    const excelBuffer = await buildExcel(
      withdraws,
      batchId,
      batch.released_date || batchId,
    );

    const filename = `payout_${batchId}_redownload.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": excelBuffer.byteLength.toString(),
        "X-Batch-Id": batchId,
        "X-User-Count": String(
          new Set(withdraws.map((w: any) => w.user_id)).size,
        ),
        "X-Is-Redownload": "true",
      },
    });
  } catch (error: any) {
    console.error("Batch Excel re-download error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 },
    );
  }
}
