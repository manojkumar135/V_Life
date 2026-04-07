/**
 * GET /api/payrelease/route.ts
 *
 * Returns users who have pending payouts ready to be released this week.
 * Amount shown = what will actually be paid (after order deductions).
 *
 * ── Payout type classification (by payout.name) ──────────────────────────
 *   "Matching Bonus"          → daily   score bucket  (spendable on orders)
 *   "Direct Sales Bonus"      → daily   score bucket  (spendable on orders)
 *   "Infinity Matching Bonus" → fortnight score bucket (spendable on orders)
 *   "Infinity Sales Bonus"    → fortnight score bucket (spendable on orders)
 *   "Referral Bonus"          → referral score bucket (NOT spendable)
 *   "Quick Star Bonus"        → quickstar score bucket (NOT spendable)
 *
 * ── Amount logic ─────────────────────────────────────────────────────────
 *   daily + fortnight → pay Score.[bucket].balance
 *                        (= earned − used = reduced if user spent on orders)
 *   referral + quickstar → pay sum of payout.withdraw_amount
 *                           (net after TDS/admin, never reduced by orders)
 *
 * ── Minimum threshold ────────────────────────────────────────────────────
 *   Only show users where total_release > ₹500
 *
 * ── This route is READ-ONLY. Nothing is written to DB here. ──────────────
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { DailyPayout } from "@/models/payout";
import { WeeklyPayout } from "@/models/payout";
import { Wallet } from "@/models/wallet";
import { Score } from "@/models/score";

// Names that belong to the daily score bucket
const DAILY_NAMES = ["Matching Bonus", "Direct Sales Bonus"];

// Names that belong to the fortnight score bucket
const FORTNIGHT_NAMES = ["Infinity Matching Bonus", "Infinity Sales Bonus"];

// Names that are NOT spendable — pay withdraw_amount directly
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

// ─── Types ───────────────────────────────────────────────────────────────────

type PayoutGroup = {
  original_total: number; // sum of payout.amount (gross, for reference)
  withdraw_total: number; // sum of payout.withdraw_amount (net after TDS/admin)
  payable:        number; // final amount to release (may differ from withdraw_total for daily/fortnight)
  payout_count:   number;
  payout_ids:     string[];
  latest_date:    string;
};

type UserGroup = {
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
  daily:               PayoutGroup | null;
  fortnight:           PayoutGroup | null;
  referral:            PayoutGroup | null;
  quickstar:           PayoutGroup | null;
  // score snapshot for transparency
  score_daily_balance:     number;
  score_fortnight_balance: number;
  // totals
  total_release: number;
};

// ─── GET Handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const from   = searchParams.get("from")   || null;
    const to     = searchParams.get("to")     || null;
    const search = searchParams.get("search") || "";

    /* ── 1. Date range (applied to payout records only) ── */
    const dateCondition: any = {};
    if (from || to) {
      dateCondition.created_at = {};
      if (from) dateCondition.created_at.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        dateCondition.created_at.$lte = end;
      }
    }

    /* ── 2. Base query: pending, no hold reasons ── */
    const baseQuery: any = {
      status: { $regex: /^pending$/i },
      $or: [
        { hold_reasons: { $exists: false } },
        { hold_reasons: { $size: 0 } },
      ],
      ...dateCondition,
    };

    /* ── 3. Fetch pending payouts from BOTH collections ── */
    const [dailyPayouts, weeklyPayouts] = await Promise.all([
      DailyPayout.find(baseQuery).lean(),
      WeeklyPayout.find(baseQuery).lean(),
    ]);

    const allPayouts = [...dailyPayouts, ...weeklyPayouts];

    /* ── 4. Collect unique user_ids ── */
    const allUserIds = [...new Set(allPayouts.map((p: any) => p.user_id))];

    if (allUserIds.length === 0) {
      return NextResponse.json(
        { success: true, data: [], total: 0 },
        { status: 200 },
      );
    }

    /* ── 5. Fetch wallets + scores in parallel ── */
    const [wallets, scores] = await Promise.all([
      Wallet.find({ user_id: { $in: allUserIds } }).lean(),
      Score.find(
        { user_id: { $in: allUserIds } },
        {
          user_id:              1,
          "daily.balance":      1,
          "daily.earned":       1,
          "daily.used":         1,
          "fortnight.balance":  1,
          "fortnight.earned":   1,
          "fortnight.used":     1,
          "referral.balance":   1,
          "quickstar.balance":  1,
        },
      ).lean(),
    ]);

    /* ── 6. Wallet eligibility map (active wallets only) ── */
    const eligibleWalletMap = new Map<string, any>();
    for (const w of wallets as any[]) {
      if (
        typeof w.wallet_status === "string" &&
        w.wallet_status.toLowerCase() === "active"
      ) {
        eligibleWalletMap.set(w.user_id, w);
      }
    }

    /* ── 7. Score map ── */
    const scoreMap = new Map<string, any>();
    for (const s of scores as any[]) {
      scoreMap.set(s.user_id, s);
    }

    /* ── 8. Build per-user groups ── */
    const userMap = new Map<string, UserGroup>();

    const getOrCreate = (payout: any, wallet: any): UserGroup => {
      if (!userMap.has(payout.user_id)) {
        userMap.set(payout.user_id, {
          user_id:             payout.user_id,
          user_name:           payout.user_name || wallet?.user_name || "",
          account_holder_name:
            wallet?.account_holder_name ||
            payout.account_holder_name  ||
            payout.user_name            ||
            "",
          contact:        wallet?.contact  || payout.contact || "",
          mail:           wallet?.mail     || payout.mail    || "",
          rank:           payout.rank      || wallet?.rank   || "",
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
          total_release:           0,
        });
      }
      return userMap.get(payout.user_id)!;
    };

    const addToGroup = (
      group: UserGroup,
      key: "daily" | "fortnight" | "referral" | "quickstar",
      payout: any,
    ) => {
      if (!group[key]) {
        group[key] = {
          original_total: 0,
          withdraw_total: 0,
          payable:        0,
          payout_count:   0,
          payout_ids:     [],
          latest_date:    "",
        };
      }
      const g = group[key]!;
      g.original_total += payout.amount          || 0;
      g.withdraw_total += payout.withdraw_amount || 0;
      g.payout_count   += 1;
      g.payout_ids.push(payout.payout_id);
      if (!g.latest_date || payout.created_at > g.latest_date) {
        g.latest_date = payout.created_at;
      }
    };

    /* ── 9. Route each payout to the correct group by name ── */
    for (const payout of allPayouts as any[]) {
      if (!eligibleWalletMap.has(payout.user_id)) continue;
      const bonusType = getBonusType(payout.name);
      if (!bonusType) continue; // unknown payout type — skip

      const group = getOrCreate(payout, eligibleWalletMap.get(payout.user_id));
      addToGroup(group, bonusType, payout);
    }

    /* ── 10. Set payable amounts ──────────────────────────────────────────
       daily + fortnight:
         Pay Score.[bucket].balance — this already reflects order deductions.
         (balance = earned − used. If user spent points on orders, balance is less.)
         We do NOT use payout.withdraw_amount for these types.

       referral + quickstar:
         Pay sum of payout.withdraw_amount — these are NOT spendable,
         so original net amount is always the payable amount.
    ─────────────────────────────────────────────────────────────────────── */
    for (const group of userMap.values()) {
      const sc = scoreMap.get(group.user_id);

      group.score_daily_balance     = sc?.daily?.balance     ?? 0;
      group.score_fortnight_balance = sc?.fortnight?.balance ?? 0;

      // daily → use live score balance (not payout.withdraw_amount)
      if (group.daily) {
        group.daily.payable = group.score_daily_balance;
      }

      // fortnight → use live score balance (not payout.withdraw_amount)
      if (group.fortnight) {
        group.fortnight.payable = group.score_fortnight_balance;
      }

      // referral → sum of withdraw_amount (fixed, not score-based)
      if (group.referral) {
        group.referral.payable = group.referral.withdraw_total;
      }

      // quickstar → sum of withdraw_amount (fixed, not score-based)
      if (group.quickstar) {
        group.quickstar.payable = group.quickstar.withdraw_total;
      }

      group.total_release =
        (group.daily?.payable     || 0) +
        (group.fortnight?.payable || 0) +
        (group.referral?.payable  || 0) +
        (group.quickstar?.payable || 0);
    }

    /* ── 11. Filter: only users with total_release > ₹500 ── */
    let result = Array.from(userMap.values()).filter(
      (row) => row.total_release > 500,
    );

    /* ── 12. Search filter ── */
    if (search.trim()) {
      const terms = search
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      result = result.filter((row) =>
        terms.some(
          (t) =>
            row.user_id.toLowerCase().includes(t)              ||
            row.user_name.toLowerCase().includes(t)            ||
            row.account_holder_name.toLowerCase().includes(t)  ||
            row.contact.toLowerCase().includes(t),
        ),
      );
    }

    /* ── 13. Sort by total_release descending ── */
    result.sort((a, b) => b.total_release - a.total_release);

    return NextResponse.json(
      { success: true, data: result, total: result.length },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Eligible payout GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error", data: [] },
      { status: 500 },
    );
  }
}