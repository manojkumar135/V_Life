/**
 * POST /api/payrelease/download/route.ts
 *
 * 1. Runs same calculation as GET (eligible users, correct payable amounts)
 * 2. Generates IDFC FIRST Bank bulk payment upload Excel file
 *    (exact same format as handleIDFCDownload utility — Row 1 headers,
 *     Row 2 instructions, Row 3+ payment data, 15 columns, freeze top 2 rows)
 * 3. For each payout_id:
 *      - Creates a Withdraw record (audit trail with date, time, batch_id, amounts)
 *      - Marks payout status → "completed"
 *      - Updates payout with account/bank details snapshot from wallet (so payout
 *        record is self-contained even if wallet changes later)
 * 4. For each eligible user:
 *      - Zeros out Score.daily.balance (withdraw += balance, balance = 0)
 *      - Zeros out Score.fortnight.balance (withdraw += balance, balance = 0)
 *      - Zeros out Score.referral.balance (withdraw += balance, balance = 0)
 *      - Zeros out Score.quickstar.balance (withdraw += balance, balance = 0)
 *      - Adds OUT record to each score bucket's history (uses $each for multiple
 *        nested array paths in a single bulkWrite op)
 *      - cashback and reward are NOT touched
 * 5. Creates a PayoutBatch document (tracks the full release event; NEFT/UTR
 *    details are filled in later via PATCH /api/payrelease/batches/[batchId])
 * 6. Returns the Excel file as download
 *
 * ── Safety: Excel is built BEFORE any DB writes. If Excel fails, DB is untouched. ──
 * ── All DB writes run in parallel after Excel succeeds. ──────────────────────────
 * ── Payout ops are split by source collection to avoid cross-collection noise. ───
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { Wallet } from "@/models/wallet";
import { Score } from "@/models/score";
import { Withdraw } from "@/models/withdraw";
import { PayoutBatch } from "@/models/batch";

// ─── Payout type classification ───────────────────────────────────────────────

const DAILY_NAMES     = ["Matching Bonus", "Direct Sales Bonus"];
const FORTNIGHT_NAMES = ["Infinity Matching Bonus", "Infinity Sales Bonus"];
const REFERRAL_NAMES  = ["Referral Bonus"];
const QUICKSTAR_NAMES = ["Quick Star Bonus"];

function getBonusType(
  name: string,
): "daily" | "fortnight" | "referral" | "quickstar" | null {
  if (DAILY_NAMES.includes(name))     return "daily";
  if (FORTNIGHT_NAMES.includes(name)) return "fortnight";
  if (REFERRAL_NAMES.includes(name))  return "referral";
  if (QUICKSTAR_NAMES.includes(name)) return "quickstar";
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PayoutRecord = {
  payout_id:           string;
  transaction_id:      string;
  user_id:             string;
  user_name:           string;
  account_holder_name: string;
  contact:             string;
  mail:                string;
  rank:                string;
  wallet_id:           string;
  pan_number:          string;
  bank_name:           string;
  account_number:      string;
  ifsc_code:           string;
  payout_name:         string;
  payout_title:        string;
  bonus_type:          "daily" | "fortnight" | "referral" | "quickstar";
  original_amount:     number;
  withdraw_amount:     number;
  tds_amount:          number;
  admin_charge:        number;
  reward_amount:       number;
  created_at:          any;
  _source:             "daily" | "weekly";
};

type PayoutGroup = {
  original_total:  number;
  withdraw_total:  number;
  payable:         number;
  payout_count:    number;
  payout_records:  PayoutRecord[];
  latest_date:     string;
};

type UserGroup = {
  user_id:                  string;
  user_name:                string;
  account_holder_name:      string;
  contact:                  string;
  mail:                     string;
  rank:                     string;
  wallet_id:                string;
  pan_number:               string;
  bank_name:                string;
  account_number:           string;
  ifsc_code:                string;
  daily:                    PayoutGroup | null;
  fortnight:                PayoutGroup | null;
  referral:                 PayoutGroup | null;
  quickstar:                PayoutGroup | null;
  score_daily_balance:      number;
  score_fortnight_balance:  number;
  score_referral_balance:   number;
  score_quickstar_balance:  number;
  deducted_daily:           number;
  deducted_fortnight:       number;
  total_deducted:           number;
  total_release:            number;
};

// ─── Excel builder — exact IDFC FIRST Bank bulk payment upload format ─────────
//
// Matches handleIDFCDownload exactly:
//   Row 1  — Column headers (15 columns), dark navy background
//   Row 2  — Field instructions, light yellow background, frozen
//   Row 3+ — One payment row per user
//            Amount = total_release (daily + fortnight + referral + quickstar)
//            This is the file the bank accepts for bulk NEFT upload.
//
// debitAccountNumber is intentionally left blank here — admin fills it in the
// bank portal before uploading, same as the client-side handleIDFCDownload.
// ─────────────────────────────────────────────────────────────────────────────

async function buildExcel(
  rows: UserGroup[],
  batchId: string,
  releaseDate: string,
): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook  = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");

  /* ── Row 1: Exact IDFC column headers (15 columns) ── */
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
    "Custom Header \u2013 1",
    "Custom Header \u2013 2",
    "Custom Header \u2013 3",
    "Custom Header \u2013 4",
    "Custom Header \u2013 5",
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type:    "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F497D" }, // dark navy — matches IDFC template
    };
    cell.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
    cell.border    = { bottom: { style: "thin", color: { argb: "FFAAAAAA" } } };
  });
  headerRow.height = 20;

  /* ── Row 2: IDFC field instructions — matches template exactly ── */
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
    cell.font      = { size: 9, color: { argb: "FF595959" }, italic: true };
    cell.alignment = { vertical: "top", wrapText: true };
    cell.fill      = {
      type:    "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF2CC" }, // light yellow — matches IDFC template
    };
  });
  instrRow.height = 72;

  /* ── Rows 3+: One payment row per user ───────────────────────────────────
     Amount = total_release which is already the correct sum of:
       daily.payable     (score balance — reflects order deductions)
       fortnight.payable (score balance — reflects order deductions)
       referral.payable  (withdraw_total — not spendable, never reduced)
       quickstar.payable (withdraw_total — not spendable, never reduced)

     This matches the GET /api/payrelease calculation exactly.
     Zero-amount rows are skipped (same as handleIDFCDownload).
  ─────────────────────────────────────────────────────────────────────────── */
  const today = new Date();
  const dd    = String(today.getDate()).padStart(2, "0");
  const mm    = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy  = today.getFullYear();
  const todayFormatted = `${dd}/${mm}/${yyyy}`; // DD/MM/YYYY as required by IDFC

  for (const row of rows) {
    const amount = Number(row.total_release ?? 0);
    if (amount <= 0) continue; // skip zero-amount rows

    const dataRow = worksheet.addRow([
      row.account_holder_name || row.user_name || "", // Beneficiary Name          — MANDATORY
      row.account_number      || "",                  // Beneficiary Account Number — MANDATORY
      row.ifsc_code           || "",                  // IFSC                       — MANDATORY
      "NEFT",                                         // Transaction Type           — MANDATORY
      "",                                             // Debit Account Number       — admin fills before upload
      todayFormatted,                                 // Transaction Date           — DD/MM/YYYY MANDATORY
      amount,                                         // Amount (total_release)     — MANDATORY
      "INR",                                          // Currency                   — MANDATORY
      row.mail                || "",                  // Beneficiary Email ID       — OPTIONAL
      `Payout - ${row.user_id}`,                      // Remarks                    — OPTIONAL
      row.user_id             || "",                  // Custom Header 1 — User ID
      row.contact             || "",                  // Custom Header 2 — Contact
      "",                                             // Custom Header 3
      "",                                             // Custom Header 4
      "",                                             // Custom Header 5
    ]);

    // Amount cell — number format, right-aligned
    const amountCell = dataRow.getCell(7); // column G
    amountCell.numFmt    = "#,##0.00";
    amountCell.alignment = { horizontal: "right" };

    // Alternate row shading for readability
    const isEven = (dataRow.number - 2) % 2 === 0;
    dataRow.eachCell((cell) => {
      cell.fill = {
        type:    "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFFAFAFA" : "FFFFFFFF" },
      };
      cell.font      = { size: 10 };
      cell.alignment = cell.alignment || { vertical: "middle" };
      cell.border    = { bottom: { style: "hair", color: { argb: "FFE0E0E0" } } };
    });

    dataRow.height = 18;
  }

  /* ── Column widths — tuned to IDFC template proportions ── */
  const colWidths = [22, 26, 14, 16, 24, 14, 12, 10, 28, 24, 16, 16, 16, 14, 14];
  worksheet.columns.forEach((col, i) => {
    if (col) col.width = colWidths[i] ?? 15;
  });

  /* ── Freeze top 2 rows so header + instructions stay visible ── */
  worksheet.views = [{ state: "frozen", ySplit: 2 }];

  return (await workbook.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(_request: Request) {
  try {
    await connectDB();

    const now         = new Date();
    const batchId     = `BATCH_${now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 15)}`;
    const releaseDate = now
      .toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
      .replace(/\//g, "-");
    const releaseTime = now.toLocaleTimeString("en-IN", {
      hour:   "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    /* ── 1. Fetch all pending payouts from BOTH collections ── */
    const baseQuery: any = {
      status: { $regex: /^pending$/i },
      $or: [
        { hold_reasons: { $exists: false } },
        { hold_reasons: { $size: 0 } },
      ],
    };

    const [dailyPayouts, weeklyPayouts] = await Promise.all([
      DailyPayout.find(baseQuery).lean(),
      WeeklyPayout.find(baseQuery).lean(),
    ]);

    const taggedDaily  = (dailyPayouts  as any[]).map((p) => ({ ...p, _source: "daily"  as const }));
    const taggedWeekly = (weeklyPayouts as any[]).map((p) => ({ ...p, _source: "weekly" as const }));
    const allPayouts   = [...taggedDaily, ...taggedWeekly];

    const allUserIds = [...new Set(allPayouts.map((p) => p.user_id))];
    if (allUserIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "No pending payouts found" },
        { status: 400 },
      );
    }

    /* ── 2. Wallets + Scores ── */
    const [wallets, scores] = await Promise.all([
      Wallet.find({ user_id: { $in: allUserIds } }).lean(),
      Score.find(
        { user_id: { $in: allUserIds } },
        {
          user_id:              1,
          "daily.balance":      1,
          "daily.withdraw":     1,
          "fortnight.balance":  1,
          "fortnight.withdraw": 1,
          "referral.balance":   1,
          "referral.withdraw":  1,
          "quickstar.balance":  1,
          "quickstar.withdraw": 1,
        },
      ).lean(),
    ]);

    /* ── 3. Eligibility + score maps ── */
    const eligibleWalletMap = new Map<string, any>();
    for (const w of wallets as any[]) {
      if (
        typeof w.wallet_status === "string" &&
        w.wallet_status.toLowerCase() === "active"
      ) {
        eligibleWalletMap.set(w.user_id, w);
      }
    }

    const scoreMap = new Map<string, any>();
    for (const s of scores as any[]) scoreMap.set(s.user_id, s);

    /* ── 4. Build user groups ── */
    const userMap = new Map<string, UserGroup>();

    const getOrCreate = (payout: any, wallet: any): UserGroup => {
      if (!userMap.has(payout.user_id)) {
        userMap.set(payout.user_id, {
          user_id:             payout.user_id,
          user_name:           payout.user_name  || wallet?.user_name  || "",
          account_holder_name:
            wallet?.account_holder_name ||
            payout.account_holder_name  ||
            payout.user_name            ||
            "",
          contact:        wallet?.contact        || payout.contact     || "",
          mail:           wallet?.mail           || payout.mail        || "",
          rank:           payout.rank            || wallet?.rank       || "",
          wallet_id:      wallet?.wallet_id      || "",
          pan_number:     wallet?.pan_number     || "",
          bank_name:      wallet?.bank_name      || "",
          account_number: wallet?.account_number || "",
          ifsc_code:      wallet?.ifsc_code      || "",
          daily:          null,
          fortnight:      null,
          referral:       null,
          quickstar:      null,
          score_daily_balance:     0,
          score_fortnight_balance: 0,
          score_referral_balance:  0,
          score_quickstar_balance: 0,
          deducted_daily:          0,
          deducted_fortnight:      0,
          total_deducted:          0,
          total_release:           0,
        });
      }
      return userMap.get(payout.user_id)!;
    };

    const addToGroup = (
      group: UserGroup,
      key: "daily" | "fortnight" | "referral" | "quickstar",
      payout: any,
      wallet: any,
    ) => {
      if (!group[key]) {
        group[key] = {
          original_total: 0,
          withdraw_total: 0,
          payable:        0,
          payout_count:   0,
          payout_records: [],
          latest_date:    "",
        };
      }
      const g = group[key]!;
      g.original_total += payout.amount          || 0;
      g.withdraw_total += payout.withdraw_amount || 0;
      g.payout_count   += 1;
      g.payout_records.push({
        payout_id:           payout.payout_id,
        transaction_id:      payout.transaction_id || payout.payout_id,
        user_id:             payout.user_id,
        user_name:           payout.user_name  || "",
        account_holder_name: wallet?.account_holder_name || payout.account_holder_name || "",
        contact:             wallet?.contact   || payout.contact || "",
        mail:                wallet?.mail      || payout.mail    || "",
        rank:                payout.rank       || "",
        wallet_id:           wallet?.wallet_id      || "",
        pan_number:          wallet?.pan_number     || "",
        bank_name:           wallet?.bank_name      || "",
        account_number:      wallet?.account_number || "",
        ifsc_code:           wallet?.ifsc_code      || "",
        payout_name:         payout.name  || "",
        payout_title:        payout.title || "",
        bonus_type:          key,
        original_amount:     payout.amount          || 0,
        withdraw_amount:     payout.withdraw_amount || 0,
        tds_amount:          payout.tds_amount      || 0,
        admin_charge:        payout.admin_charge    || 0,
        reward_amount:       payout.reward_amount   || 0,
        created_at:          payout.created_at,
        _source:             payout._source,
      });
      if (!g.latest_date || payout.created_at > g.latest_date) {
        g.latest_date = payout.created_at;
      }
    };

    for (const payout of allPayouts) {
      if (!eligibleWalletMap.has(payout.user_id)) continue;
      const bonusType = getBonusType(payout.name);
      if (!bonusType) continue;
      const wallet = eligibleWalletMap.get(payout.user_id);
      const group  = getOrCreate(payout, wallet);
      addToGroup(group, bonusType, payout, wallet);
    }

    /* ── 5. Set payable from score balances — mirrors GET /api/payrelease ──
       daily + fortnight → payable = score.balance (already reduced by order spends)
       referral          → payable = withdraw_total (not spendable, never reduced)
       quickstar         → payable = withdraw_total (not spendable, never reduced)

       total_release = sum of all four payable amounts.
       This is the single Amount written into the IDFC Excel per user.
    ─────────────────────────────────────────────────────────────────────────── */
    for (const group of userMap.values()) {
      const sc = scoreMap.get(group.user_id);

      group.score_daily_balance     = sc?.daily?.balance     ?? 0;
      group.score_fortnight_balance = sc?.fortnight?.balance ?? 0;
      group.score_referral_balance  = sc?.referral?.balance  ?? 0;
      group.score_quickstar_balance = sc?.quickstar?.balance ?? 0;

      if (group.daily) {
        group.daily.payable      = group.score_daily_balance;
        group.deducted_daily     = Math.max(
          0,
          group.daily.withdraw_total - group.score_daily_balance,
        );
      }

      if (group.fortnight) {
        group.fortnight.payable  = group.score_fortnight_balance;
        group.deducted_fortnight = Math.max(
          0,
          group.fortnight.withdraw_total - group.score_fortnight_balance,
        );
      }

      // referral — not spendable, pay full withdraw_total
      if (group.referral) {
        group.referral.payable = group.referral.withdraw_total;
      }

      // quickstar — not spendable, pay full withdraw_total
      if (group.quickstar) {
        group.quickstar.payable = group.quickstar.withdraw_total;
      }

      group.total_deducted =
        (group.deducted_daily || 0) + (group.deducted_fortnight || 0);

      // total_release includes ALL four bonus types
      group.total_release =
        (group.daily?.payable     || 0) +
        (group.fortnight?.payable || 0) +
        (group.referral?.payable  || 0) +  // ← referral included
        (group.quickstar?.payable || 0);    // ← quickstar included
    }

    /* ── 6. Filter > ₹500 ── */
    const eligibleRows = Array.from(userMap.values())
      .filter((r) => r.total_release > 500)
      .sort((a, b) => b.total_release - a.total_release);

    if (eligibleRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "No users with payable amount > ₹500" },
        { status: 400 },
      );
    }

    /* ── 7. Build IDFC Excel FIRST (before touching DB) ── */
    const excelBuffer = await buildExcel(eligibleRows, batchId, releaseDate);

    /* ── 8. Build all DB operations ── */
    const scoreOps:        any[] = [];
    const dailyPayoutOps:  any[] = [];
    const weeklyPayoutOps: any[] = [];
    const withdrawDocs:    any[] = [];
    let   totalPayoutCount = 0;
    let   grandTotal       = 0;

    for (const row of eligibleRows) {
      const sc = scoreMap.get(row.user_id);

      const dailyBal     = sc?.daily?.balance     ?? 0;
      const fortnightBal = sc?.fortnight?.balance ?? 0;
      const referralBal  = sc?.referral?.balance  ?? 0;
      const quickstarBal = sc?.quickstar?.balance ?? 0;

      /* ── A: Score zero-out ($each required for multiple nested array paths) ── */
      const $incFields:  any = {};
      const $setFields:  any = { updated_at: now };
      const $pushFields: any = {};

      if (row.daily && dailyBal > 0) {
        $incFields["daily.withdraw"]     = dailyBal;
        $setFields["daily.balance"]      = 0;
        $pushFields["daily.history.out"] = {
          $each: [{
            module:        "withdrawal",
            reference_id:  batchId,
            points:        dailyBal,
            balance_after: 0,
            remarks:       `Weekly NEFT release — Batch ${batchId}`,
            created_at:    now,
          }],
        };
      }

      if (row.fortnight && fortnightBal > 0) {
        $incFields["fortnight.withdraw"]     = fortnightBal;
        $setFields["fortnight.balance"]      = 0;
        $pushFields["fortnight.history.out"] = {
          $each: [{
            module:        "withdrawal",
            reference_id:  batchId,
            points:        fortnightBal,
            balance_after: 0,
            remarks:       `Weekly NEFT release — Batch ${batchId}`,
            created_at:    now,
          }],
        };
      }

      if (row.referral && referralBal > 0) {
        $incFields["referral.withdraw"]     = referralBal;
        $setFields["referral.balance"]      = 0;
        $pushFields["referral.history.out"] = {
          $each: [{
            module:        "withdrawal",
            reference_id:  batchId,
            points:        referralBal,
            balance_after: 0,
            remarks:       `Weekly NEFT release — Batch ${batchId}`,
            created_at:    now,
          }],
        };
      }

      if (row.quickstar && quickstarBal > 0) {
        $incFields["quickstar.withdraw"]     = quickstarBal;
        $setFields["quickstar.balance"]      = 0;
        $pushFields["quickstar.history.out"] = {
          $each: [{
            module:        "withdrawal",
            reference_id:  batchId,
            points:        quickstarBal,
            balance_after: 0,
            remarks:       `Weekly NEFT release — Batch ${batchId}`,
            created_at:    now,
          }],
        };
      }

      const hasScoreWork =
        Object.keys($incFields).length > 0 ||
        Object.keys($pushFields).length > 0;

      if (hasScoreWork) {
        const updateDoc: any = { $set: $setFields };
        if (Object.keys($incFields).length)  updateDoc.$inc  = $incFields;
        if (Object.keys($pushFields).length) updateDoc.$push = $pushFields;
        scoreOps.push({
          updateOne: { filter: { user_id: row.user_id }, update: updateDoc },
        });
      }

      grandTotal += row.total_release;

      /* ── B + C: Per payout_id — status update + Withdraw docs ── */
      const groups = [
        { group: row.daily,     bal: dailyBal,     scoreBased: true  },
        { group: row.fortnight, bal: fortnightBal, scoreBased: true  },
        { group: row.referral,  bal: referralBal,  scoreBased: false },
        { group: row.quickstar, bal: quickstarBal, scoreBased: false },
      ].filter((g) => g.group !== null) as {
        group: PayoutGroup;
        bal: number;
        scoreBased: boolean;
      }[];

      for (const { group, bal, scoreBased } of groups) {
        totalPayoutCount += group.payout_records.length;

        for (const rec of group.payout_records) {
          const payoutOp = {
            updateOne: {
              filter: { payout_id: rec.payout_id },
              update: {
                $set: {
                  status:              "completed",
                  last_modified_at:    now,
                  last_modified_by:    "system_weekly_release",
                  remarks:             `Released via batch ${batchId} on ${releaseDate} at ${releaseTime}`,
                  released_batch_id:   batchId,
                  released_date:       releaseDate,
                  released_time:       releaseTime,
                  released_at:         now,
                  account_holder_name: rec.account_holder_name,
                  bank_name:           rec.bank_name,
                  account_number:      rec.account_number,
                  ifsc_code:           rec.ifsc_code,
                  pan_number:          rec.pan_number,
                  wallet_id:           rec.wallet_id,
                },
              },
            },
          };

          if (rec._source === "daily") {
            dailyPayoutOps.push(payoutOp);
          } else {
            weeklyPayoutOps.push(payoutOp);
          }

          const releasedAmount = scoreBased
            ? group.withdraw_total > 0
              ? Math.round((rec.withdraw_amount / group.withdraw_total) * bal * 100) / 100
              : 0
            : rec.withdraw_amount;

          withdrawDocs.push({
            payout_id:            rec.payout_id,
            transaction_id:       rec.transaction_id,
            batch_id:             batchId,
            released_at:          now,
            released_date:        releaseDate,
            released_time:        releaseTime,
            user_id:              rec.user_id,
            user_name:            rec.user_name,
            account_holder_name:  rec.account_holder_name,
            contact:              rec.contact,
            mail:                 rec.mail,
            rank:                 rec.rank,
            wallet_id:            rec.wallet_id,
            pan_number:           rec.pan_number,
            bank_name:            rec.bank_name,
            account_number:       rec.account_number,
            ifsc_code:            rec.ifsc_code,
            payout_name:          rec.payout_name,
            payout_title:         rec.payout_title,
            bonus_type:           rec.bonus_type,
            original_amount:      rec.original_amount,
            tds_amount:           rec.tds_amount,
            admin_charge:         rec.admin_charge,
            reward_amount:        rec.reward_amount,
            released_amount:      releasedAmount,
            score_balance_before: bal,
            score_balance_after:  0,
            neft_utr:               null,
            neft_transaction_date:  null,
            neft_transaction_time:  null,
            neft_bank_ref:          null,
            neft_remarks:           null,
            transaction_updated_at: null,
            transaction_updated_by: null,
            status:     "completed",
            remarks:    `NEFT release via batch ${batchId}`,
            created_at: now,
          });
        }
      }
    }

    /* ── 9. Execute all DB writes in parallel ── */
    await Promise.all([
      scoreOps.length > 0
        ? Score.bulkWrite(scoreOps)
        : Promise.resolve(),

      dailyPayoutOps.length > 0
        ? DailyPayout.bulkWrite(dailyPayoutOps)
        : Promise.resolve(),

      weeklyPayoutOps.length > 0
        ? WeeklyPayout.bulkWrite(weeklyPayoutOps)
        : Promise.resolve(),

      withdrawDocs.length > 0
        ? Withdraw.bulkWrite(
            withdrawDocs.map((doc) => ({
              updateOne: {
                filter: { payout_id: doc.payout_id },
                update: { $setOnInsert: doc },
                upsert: true,
              },
            })),
          )
        : Promise.resolve(),

      PayoutBatch.create({
        batch_id:      batchId,
        released_at:   now,
        released_date: releaseDate,
        released_time: releaseTime,
        released_by:   "admin",
        user_count:    eligibleRows.length,
        total_amount:  grandTotal,
        payout_count:  totalPayoutCount,
        status:        "released",
      }),
    ]);

    /* ── 10. Return IDFC Excel file ── */
    const filename = `idfc_payout_${batchId}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      excelBuffer.byteLength.toString(),
        "X-Batch-Id":          batchId,
        "X-User-Count":        eligibleRows.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Payout download error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 },
    );
  }
}