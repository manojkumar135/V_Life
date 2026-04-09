/**
 * GET /api/payrelease/batches/[batchId]/excel/route.ts
 *
 * Re-generates the NEFT Excel file for an already-released batch.
 * Reads from Withdraw collection — NO DB writes whatsoever.
 *
 * This is the safe re-download endpoint. The original POST /api/payrelease/download
 * only runs once (it creates records + zeros balances). This endpoint can be called
 * any number of times to get the same Excel back.
 *
 * Excel columns match the original download exactly so the bank upload file
 * is identical to what was first generated.
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Withdraw } from "@/models/withdraw";
import { PayoutBatch } from "@/models/batch";

// ─── Excel builder (same layout as original download) ────────────────────────

async function buildExcel(
  withdraws: any[],
  batchId: string,
  releaseDate: string,
): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("NEFT Payout");

  ws.columns = [
    { header: "S.No",                key: "sno",            width: 6  },
    { header: "Batch ID",            key: "batch_id",       width: 22 },
    { header: "User ID",             key: "user_id",        width: 16 },
    { header: "User Name",           key: "user_name",      width: 22 },
    { header: "Account Holder",      key: "account_holder", width: 22 },
    { header: "Contact",             key: "contact",        width: 14 },
    { header: "PAN",                 key: "pan",            width: 14 },
    { header: "Bank Name",           key: "bank_name",      width: 22 },
    { header: "Account Number",      key: "account_number", width: 22 },
    { header: "IFSC Code",           key: "ifsc",           width: 14 },
    { header: "Payout Name",         key: "payout_name",    width: 20 },
    { header: "Bonus Type",          key: "bonus_type",     width: 14 },
    { header: "Original Amount (₹)", key: "original",       width: 18 },
    { header: "TDS (₹)",             key: "tds",            width: 12 },
    { header: "Admin Charge (₹)",    key: "admin",          width: 14 },
    { header: "Released Amount (₹)", key: "released",       width: 18 },
    { header: "NEFT UTR",            key: "neft_utr",       width: 20 },
    { header: "NEFT Date",           key: "neft_date",      width: 14 },
  ];

  // Header row styling
  const headerRow = ws.getRow(1);
  headerRow.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 10, name: "Arial" };
  headerRow.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height    = 22;

  // Group by user_id so each user is one row (sum their released amounts)
  // Withdraw has one record per payout_id — we collapse to per-user for the Excel
  const userMap = new Map<string, any>();

  for (const w of withdraws) {
    if (!userMap.has(w.user_id)) {
      userMap.set(w.user_id, {
        user_id:             w.user_id,
        user_name:           w.user_name,
        account_holder_name: w.account_holder_name,
        contact:             w.contact,
        pan_number:          w.pan_number,
        bank_name:           w.bank_name,
        account_number:      w.account_number,
        ifsc_code:           w.ifsc_code,
        payout_names:        new Set<string>(),
        bonus_types:         new Set<string>(),
        original_total:      0,
        tds_total:           0,
        admin_total:         0,
        released_total:      0,
        neft_utr:            w.neft_utr || "",
        neft_date:           w.neft_transaction_date || "",
      });
    }
    const u = userMap.get(w.user_id)!;
    u.payout_names.add(w.payout_name || "");
    u.bonus_types.add(w.bonus_type   || "");
    u.original_total += w.original_amount  || 0;
    u.tds_total      += w.tds_amount       || 0;
    u.admin_total    += w.admin_charge     || 0;
    u.released_total += w.released_amount  || 0;
    // Use the UTR if any record in this batch has it (batch mode sets same UTR for all)
    if (w.neft_utr && !u.neft_utr) u.neft_utr  = w.neft_utr;
    if (w.neft_transaction_date && !u.neft_date) u.neft_date = w.neft_transaction_date;
  }

  const rows = Array.from(userMap.values()).sort((a, b) =>
    b.released_total - a.released_total,
  );

  rows.forEach((r, i) => {
    const row = ws.addRow({
      sno:            i + 1,
      batch_id:       batchId,
      user_id:        r.user_id,
      user_name:      r.user_name,
      account_holder: r.account_holder_name,
      contact:        r.contact,
      pan:            r.pan_number,
      bank_name:      r.bank_name,
      account_number: r.account_number,
      ifsc:           r.ifsc_code,
      payout_name:    [...r.payout_names].filter(Boolean).join(", "),
      bonus_type:     [...r.bonus_types].filter(Boolean).join(", "),
      original:       r.original_total,
      tds:            r.tds_total,
      admin:          r.admin_total,
      released:       r.released_total,
      neft_utr:       r.neft_utr  || "—",
      neft_date:      r.neft_date || "—",
    });

    // Alternate row shading
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
      });
    }

    // Released column — bold blue
    row.getCell("released").font = { bold: true, color: { argb: "FF1F4E79" }, name: "Arial" };
    // UTR column — green if filled, orange if missing
    row.getCell("neft_utr").font = {
      color: { argb: r.neft_utr ? "FF2E7D32" : "FFE65100" },
      name: "Arial",
    };

    // Number format for amount cells
    ["original", "tds", "admin", "released"].forEach((k) => {
      row.getCell(k).numFmt = `"₹"#,##0.00`;
    });

    row.font = { name: "Arial", size: 10 };
  });

  // Totals row
  const lastData  = rows.length + 1;
  const totalsRow = ws.getRow(lastData + 2);
  totalsRow.getCell("bank_name").value = `Total — ${rows.length} users | ${releaseDate}`;
  totalsRow.getCell("bank_name").font  = { bold: true, italic: true, name: "Arial" };

  (["original", "tds", "admin", "released"] as const).forEach((k, idx) => {
    const colLetter = ["M", "N", "O", "P"][idx];
    totalsRow.getCell(k).value  = { formula: `SUM(${colLetter}2:${colLetter}${lastData})` };
    totalsRow.getCell(k).numFmt = `"₹"#,##0.00`;
    totalsRow.getCell(k).font   = { bold: true, name: "Arial" };
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];

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
    const batch = await PayoutBatch.findOne({ batch_id: batchId }).lean() as any;
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
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      excelBuffer.byteLength.toString(),
        "X-Batch-Id":          batchId,
        "X-User-Count":        String(new Set(withdraws.map((w: any) => w.user_id)).size),
        "X-Is-Redownload":     "true",
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