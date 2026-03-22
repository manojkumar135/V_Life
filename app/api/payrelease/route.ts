import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { Wallet } from "@/models/wallet";
import { Score } from "@/models/score";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // all | daily | fortnight
    const from   = searchParams.get("from")   || null;
    const to     = searchParams.get("to")     || null;
    const search = searchParams.get("search") || "";

    /* ─────────────────────────────────────────────
       1. Build date range condition (payout only)
          Score balance is NEVER date-filtered —
          it is always the live current balance
    ───────────────────────────────────────────── */
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

    /* ─────────────────────────────────────────────
       2. Base query — pending, no hold reasons
    ───────────────────────────────────────────── */
    const baseQuery: any = {
      status: { $regex: /^pending$/i },
      $or: [
        { hold_reasons: { $exists: false } },
        { hold_reasons: { $size: 0 } },
      ],
      ...dateCondition,
    };

    /* ─────────────────────────────────────────────
       3. Fetch pending payouts from both collections
    ───────────────────────────────────────────── */
    const [dailyPayouts, fortnightPayouts] = await Promise.all([
      filter !== "fortnight" ? DailyPayout.find(baseQuery).lean()  : [],
      filter !== "daily"     ? WeeklyPayout.find(baseQuery).lean() : [],
    ]);

    /* ─────────────────────────────────────────────
       4. Collect all unique user_ids
    ───────────────────────────────────────────── */
    const allUserIds = [
      ...new Set([
        ...dailyPayouts.map((p: any) => p.user_id),
        ...fortnightPayouts.map((p: any) => p.user_id),
      ]),
    ];

    if (allUserIds.length === 0) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    /* ─────────────────────────────────────────────
       5. Fetch wallets + scores in parallel
          Score.daily.balance   = matching_bonus + direct_sales_bonus
                                  points earned MINUS points used on orders
          Score.fortnight.balance = infinity_matching + infinity_direct_sales
                                  points earned MINUS points used on orders
          Both are always live — no date filter applied
    ───────────────────────────────────────────── */
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
        }
      ).lean(),
    ]);

    /* ─────────────────────────────────────────────
       6. Build wallet eligibility map
          - wallet_status must be "active"
          - pan_verified in ["yes", "true"]
    ───────────────────────────────────────────── */
    const PAN_VERIFIED_VALUES = new Set(["yes", "true"]);

    const eligibleWalletMap = new Map<string, any>();
    for (const w of wallets as any[]) {
      const walletActive =
        typeof w.wallet_status === "string" &&
        w.wallet_status.toLowerCase() === "active";

      const panVerified =
        typeof w.pan_verified === "string" &&
        PAN_VERIFIED_VALUES.has(w.pan_verified.toLowerCase());

      if (walletActive && panVerified) {
        eligibleWalletMap.set(w.user_id, w);
      }
    }

    /* ─────────────────────────────────────────────
       7. Build score map — keyed by user_id
    ───────────────────────────────────────────── */
    const scoreMap = new Map<string, {
      daily_balance:      number;
      daily_earned:       number;
      daily_used:         number;
      fortnight_balance:  number;
      fortnight_earned:   number;
      fortnight_used:     number;
    }>();

    for (const s of scores as any[]) {
      scoreMap.set(s.user_id, {
        daily_balance:      s.daily?.balance      ?? 0,
        daily_earned:       s.daily?.earned       ?? 0,
        daily_used:         s.daily?.used         ?? 0,
        fortnight_balance:  s.fortnight?.balance  ?? 0,
        fortnight_earned:   s.fortnight?.earned   ?? 0,
        fortnight_used:     s.fortnight?.used     ?? 0,
      });
    }

    /* ─────────────────────────────────────────────
       8. Group eligible payouts by user
          Two separate concerns per user:

          A) PAYOUT (money) — pending payout records
             daily.payout_total     = sum of all pending DailyPayout amounts
             fortnight.payout_total = sum of all pending WeeklyPayout amounts

          B) SCORE (points) — live balance from Score collection
             score.daily_balance    = current daily points remaining
                                      (already net of points used on orders)
             score.fortnight_balance = current fortnight points remaining
                                      (already net of points used on orders)

          These two are independent — payout amount is what
          will be released as money; score balance is how many
          points the user currently holds.
    ───────────────────────────────────────────── */
    type PayoutGroup = {
      payout_total: number;
      payout_count: number;
      payout_ids:   string[];
      latest_date:  string;
    };

    type UserGroup = {
      user_id:        string;
      user_name:      string;
      contact:        string;
      rank:           string;
      wallet_id:      string;
      pan_number:     string;
      bank_name:      string;
      account_number: string;
      ifsc_code:      string;
      daily:          PayoutGroup | null;
      fortnight:      PayoutGroup | null;
      combined_payout_total: number;
      score: {
        daily_balance:      number;
        daily_earned:       number;
        daily_used:         number;
        fortnight_balance:  number;
        fortnight_earned:   number;
        fortnight_used:     number;
      };
    };

    const userMap = new Map<string, UserGroup>();

    const getOrCreate = (payout: any, wallet: any): UserGroup => {
      if (!userMap.has(payout.user_id)) {
        const sc = scoreMap.get(payout.user_id) ?? {
          daily_balance:     0,
          daily_earned:      0,
          daily_used:        0,
          fortnight_balance: 0,
          fortnight_earned:  0,
          fortnight_used:    0,
        };

        userMap.set(payout.user_id, {
          user_id:        payout.user_id,
          user_name:      payout.user_name       || wallet?.user_name      || "",
          contact:        payout.contact         || wallet?.contact        || "",
          rank:           payout.rank            || wallet?.rank           || "",
          wallet_id:      wallet?.wallet_id      || "",
          pan_number:     wallet?.pan_number     || "",
          bank_name:      wallet?.bank_name      || "",
          account_number: wallet?.account_number || "",
          ifsc_code:      wallet?.ifsc_code      || "",
          daily:          null,
          fortnight:      null,
          combined_payout_total: 0,
          score:          sc,
        });
      }
      return userMap.get(payout.user_id)!;
    };

    // Process daily payouts
    for (const payout of dailyPayouts as any[]) {
      if (!eligibleWalletMap.has(payout.user_id)) continue;
      const wallet = eligibleWalletMap.get(payout.user_id);
      const group  = getOrCreate(payout, wallet);

      if (!group.daily) {
        group.daily = { payout_total: 0, payout_count: 0, payout_ids: [], latest_date: "" };
      }
      group.daily.payout_total += payout.amount || 0;
      group.daily.payout_count += 1;
      group.daily.payout_ids.push(payout.payout_id);
      if (!group.daily.latest_date || payout.created_at > group.daily.latest_date) {
        group.daily.latest_date = payout.created_at;
      }
    }

    // Process fortnight payouts
    for (const payout of fortnightPayouts as any[]) {
      if (!eligibleWalletMap.has(payout.user_id)) continue;
      const wallet = eligibleWalletMap.get(payout.user_id);
      const group  = getOrCreate(payout, wallet);

      if (!group.fortnight) {
        group.fortnight = { payout_total: 0, payout_count: 0, payout_ids: [], latest_date: "" };
      }
      group.fortnight.payout_total += payout.amount || 0;
      group.fortnight.payout_count += 1;
      group.fortnight.payout_ids.push(payout.payout_id);
      if (!group.fortnight.latest_date || payout.created_at > group.fortnight.latest_date) {
        group.fortnight.latest_date = payout.created_at;
      }
    }

    // Compute combined_payout_total
    for (const group of userMap.values()) {
      group.combined_payout_total =
        (group.daily?.payout_total     || 0) +
        (group.fortnight?.payout_total || 0);
    }

    /* ─────────────────────────────────────────────
       9. Convert to array and apply search filter
    ───────────────────────────────────────────── */
    let result = Array.from(userMap.values());

    if (search.trim()) {
      const terms = search
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      result = result.filter((row) =>
        terms.some(
          (t) =>
            row.user_id.toLowerCase().includes(t)   ||
            row.user_name.toLowerCase().includes(t) ||
            row.contact.toLowerCase().includes(t)
        )
      );
    }

    /* ─────────────────────────────────────────────
       10. Sort by combined_payout_total descending
    ───────────────────────────────────────────── */
    result.sort((a, b) => b.combined_payout_total - a.combined_payout_total);

    return NextResponse.json(
      { success: true, data: result, total: result.length },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Eligible payout report error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error", data: [] },
      { status: 500 }
    );
  }
}