import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { Wallet } from "@/models/wallet";
import { Score } from "@/models/score";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const from   = searchParams.get("from")   || null;
    const to     = searchParams.get("to")     || null;
    const search = searchParams.get("search") || "";

    /* ─────────────────────────────────────────────
       1. Date range — applied to payout records only.
          Score balance is NEVER date-filtered.
          It is always the live current balance.
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
       2. Base query — pending + no hold reasons
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
      DailyPayout.find(baseQuery).lean(),
      WeeklyPayout.find(baseQuery).lean(),
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
      return NextResponse.json({ success: true, data: [], total: 0 }, { status: 200 });
    }

    /* ─────────────────────────────────────────────
       5. Fetch wallets + scores in parallel

       WHY Score balance = payable amount:
         Score.daily.balance     = daily.earned   - daily.used
         Score.fortnight.balance = fortnight.earned - fortnight.used

         earned = all matching_bonus + direct_sales_bonus points
                  added over all time (from released payouts)
         used   = all points spent on orders over all time

         So balance is exactly what the user has left to be paid.
         If user spent some points on orders before release,
         balance is already reduced — we pay only the balance.
         If no points were used, balance == full earned == full payable.

         payout.amount on individual records is the ORIGINAL amount
         at creation time — it does NOT reflect order deductions.
         So we IGNORE payout.amount for the payable figure.
         We use it only to count records and track payout_ids.
    ───────────────────────────────────────────── */
    const [wallets, scores] = await Promise.all([
      Wallet.find({ user_id: { $in: allUserIds } }).lean(),
      Score.find(
        { user_id: { $in: allUserIds } },
        {
          user_id:             1,
          "daily.balance":     1,
          "daily.earned":      1,
          "daily.used":        1,
          "fortnight.balance": 1,
          "fortnight.earned":  1,
          "fortnight.used":    1,
        }
      ).lean(),
    ]);

    /* ─────────────────────────────────────────────
       6. Wallet eligibility map
          - wallet_status === "active"
          (pan_verified not required — payout may have been
           released before PAN was verified; status=pending
           is the source of truth for display)
    ───────────────────────────────────────────── */
    const eligibleWalletMap = new Map<string, any>();

    for (const w of wallets as any[]) {
      const walletActive =
        typeof w.wallet_status === "string" &&
        w.wallet_status.toLowerCase() === "active";

      if (walletActive) {
        eligibleWalletMap.set(w.user_id, w);
      }
    }

    /* ─────────────────────────────────────────────
       7. Score map — keyed by user_id
    ───────────────────────────────────────────── */
    type ScoreEntry = {
      daily_balance:     number;
      daily_earned:      number;
      daily_used:        number;
      fortnight_balance: number;
      fortnight_earned:  number;
      fortnight_used:    number;
    };

    const scoreMap = new Map<string, ScoreEntry>();
    for (const s of scores as any[]) {
      scoreMap.set(s.user_id, {
        daily_balance:     s.daily?.balance      ?? 0,
        daily_earned:      s.daily?.earned       ?? 0,
        daily_used:        s.daily?.used         ?? 0,
        fortnight_balance: s.fortnight?.balance  ?? 0,
        fortnight_earned:  s.fortnight?.earned   ?? 0,
        fortnight_used:    s.fortnight?.used     ?? 0,
      });
    }

    /* ─────────────────────────────────────────────
       8. Group eligible payouts by user

       PER USER:
         daily.payout_ids / payout_count
           → which pending daily records exist (for reference)
         daily.original_total
           → sum of payout.amount on those records (original, before deductions)
         daily.payable
           → Score.daily.balance = actual amount to release
             (original minus whatever was spent on orders)

         Same logic for fortnight.

         total_release = daily.payable + fortnight.payable
           → single combined amount admin will actually release to this user
    ───────────────────────────────────────────── */
    type PayoutGroup = {
      original_total: number;
      payable:        number;
      payout_count:   number;
      payout_ids:     string[];
      latest_date:    string;
    };

    type UserGroup = {
      user_id:              string;
      user_name:            string;
      account_holder_name:  string; // ← from wallet — actual bank-registered name
      contact:              string; // ← preferred from wallet (more up-to-date)
      mail:                 string; // ← from wallet
      rank:                 string;
      wallet_id:            string;
      pan_number:           string;
      bank_name:            string;
      account_number:       string;
      ifsc_code:            string;
      daily:                PayoutGroup | null;
      fortnight:            PayoutGroup | null;
      total_release:        number; // ← single amount: daily.payable + fortnight.payable
    };

    const userMap = new Map<string, UserGroup>();

    const getOrCreate = (payout: any, wallet: any): UserGroup => {
      if (!userMap.has(payout.user_id)) {
        userMap.set(payout.user_id, {
          user_id:             payout.user_id,
          user_name:           payout.user_name  || wallet?.user_name  || "",
          // account_holder_name is the bank-registered name — always prefer wallet
          account_holder_name: wallet?.account_holder_name || payout.account_holder_name || payout.user_name || "",
          // contact — wallet is more up-to-date than the payout snapshot
          contact:             wallet?.contact   || payout.contact     || "",
          mail:                wallet?.mail      || payout.mail        || "",
          rank:                payout.rank       || wallet?.rank       || "",
          wallet_id:           wallet?.wallet_id      || "",
          pan_number:          wallet?.pan_number     || "",
          bank_name:           wallet?.bank_name      || "",
          account_number:      wallet?.account_number || "",
          ifsc_code:           wallet?.ifsc_code      || "",
          daily:               null,
          fortnight:           null,
          total_release:       0,
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
        group.daily = {
          original_total: 0,
          payable:        0,
          payout_count:   0,
          payout_ids:     [],
          latest_date:    "",
        };
      }
      group.daily.original_total += payout.amount || 0;
      group.daily.payout_count   += 1;
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
        group.fortnight = {
          original_total: 0,
          payable:        0,
          payout_count:   0,
          payout_ids:     [],
          latest_date:    "",
        };
      }
      group.fortnight.original_total += payout.amount || 0;
      group.fortnight.payout_count   += 1;
      group.fortnight.payout_ids.push(payout.payout_id);
      if (!group.fortnight.latest_date || payout.created_at > group.fortnight.latest_date) {
        group.fortnight.latest_date = payout.created_at;
      }
    }

    /* ─────────────────────────────────────────────
       9. Set payable from Score.balance
          and compute total_release (daily + fortnight)
    ───────────────────────────────────────────── */
    for (const group of userMap.values()) {
      const sc = scoreMap.get(group.user_id);

      if (group.daily) {
        group.daily.payable = sc?.daily_balance ?? 0;
      }

      if (group.fortnight) {
        group.fortnight.payable = sc?.fortnight_balance ?? 0;
      }

      // total_release is the single amount shown in UI and used in IDFC download
      group.total_release =
        (group.daily?.payable     || 0) +
        (group.fortnight?.payable || 0);
    }

    /* ─────────────────────────────────────────────
       10. Convert to array, apply search filter
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
            row.user_id.toLowerCase().includes(t)                  ||
            row.user_name.toLowerCase().includes(t)                ||
            row.account_holder_name.toLowerCase().includes(t)      ||
            row.contact.toLowerCase().includes(t)
        )
      );
    }

    /* ─────────────────────────────────────────────
       11. Sort by total_release descending
    ───────────────────────────────────────────── */
    result.sort((a, b) => b.total_release - a.total_release);

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