import { NextResponse }          from "next/server";
import { connectDB }             from "@/lib/mongodb";
import { MonthlyPayoutTracker }  from "@/models/monthlyPayoutTracker";
import { User }                  from "@/models/user";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const user_id = searchParams.get("user_id");
    const search  = searchParams.get("search") || "";
    const from    = searchParams.get("from");
    const to      = searchParams.get("to");
    const date    = searchParams.get("date");

    // ─────────────────────────────────────────────────────────────────
    // Helper — fetch user details from User model
    // ─────────────────────────────────────────────────────────────────
    async function getUserDetails(uid: string) {
      const u = await User.findOne({ user_id: uid })
        .select(
          "user_id user_name name contact mail rank club refer_by infinity profile"
        )
        .lean() as any;

      if (!u) return null;

      return {
        user_name: u.user_name || u.name || "—",
        contact:   u.contact   || "—",
        mail:      u.mail      || "—",
        rank:      u.rank      || "none",
        club:      u.club      || "none",
        refer_by:  u.refer_by  || "—",
        infinity:  u.infinity  || "—",
        profile:   u.profile   || null,
      };
    }

    // ─────────────────────────────────────────────────────────────────
    // DETAIL VIEW — user_id passed → return all months for that user
    // ─────────────────────────────────────────────────────────────────
    if (user_id) {
      const [trackers, userDetails] = await Promise.all([
        MonthlyPayoutTracker.find({ user_id })
          .sort({ month: 1 })
          .lean() as Promise<any[]>,
        getUserDetails(user_id),
      ]);

      if (!trackers.length) {
        return NextResponse.json(
          { success: false, message: "No PV tracker data found" },
          { status: 404 }
        );
      }

      // ── Per-month breakdown ───────────────────────────────────────
      const months = trackers.map((t) => ({
        month:            t.month,
        total_payout:     t.total_payout     ?? 0,
        pv_required:      t.pv_required      ?? 0,
        pv_fulfilled:     t.pv_fulfilled     ?? 0,
        pv_remaining:     (t.pv_required ?? 0) - (t.pv_fulfilled ?? 0),
        hold_released:    t.hold_released    ?? false,
        hold_released_at: t.hold_released_at ?? null,
        crossed_1lakh_at: t.crossed_1lakh_at ?? null,
        crossed_3lakh_at: t.crossed_3lakh_at ?? null,
        pv_orders:        t.pv_orders        ?? [],
      }));

      // ── Summary ───────────────────────────────────────────────────
      const totalPvRequired  = months.reduce((s, m) => s + m.pv_required,  0);
      const totalPvFulfilled = months.reduce((s, m) => s + m.pv_fulfilled, 0);
      const totalPvRemaining = months.reduce((s, m) => s + m.pv_remaining, 0);
      const pendingMonths    = months.filter((m) => !m.hold_released && m.pv_required > 0);
      const clearedMonths    = months.filter((m) =>  m.hold_released && m.pv_required > 0);

      return NextResponse.json({
        success: true,
        type:    "detail",
        data: {
          user_id,
          user_name: userDetails?.user_name || "—",
          contact:   userDetails?.contact   || "—",
          mail:      userDetails?.mail      || "—",
          rank:      userDetails?.rank      || "none",
          club:      userDetails?.club      || "none",
          refer_by:  userDetails?.refer_by  || "—",
          infinity:  userDetails?.infinity  || "—",
          profile:   userDetails?.profile   || null,
          summary: {
            totalPvRequired,
            totalPvFulfilled,
            totalPvRemaining,
            totalMonths:   months.length,
            pendingMonths: pendingMonths.length,
            clearedMonths: clearedMonths.length,
          },
          months,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────
    // LIST VIEW — no user_id → return all users with pending PV
    // ─────────────────────────────────────────────────────────────────
    const trackers = await MonthlyPayoutTracker.find({
      pv_required:   { $gt: 0 },
      hold_released: false,
    })
    .sort({ month: 1 })
    .lean() as any[];

    // ── Group by user_id ──────────────────────────────────────────
    const userMap = new Map<string, any>();

    for (const t of trackers) {
      const existing = userMap.get(t.user_id);

      const monthEntry = {
        month:        t.month,
        pv_required:  t.pv_required,
        pv_fulfilled: t.pv_fulfilled,
        pv_remaining: t.pv_required - t.pv_fulfilled,
        total_payout: t.total_payout,
        cleared:      false,
      };

      if (!existing) {
        userMap.set(t.user_id, {
          user_id:          t.user_id,
          // placeholders — will be replaced by User fetch below
          user_name:        "—",
          contact:          "—",
          mail:             "—",
          rank:             "none",
          club:             "none",
          refer_by:         "—",
          infinity:         "—",
          totalPvRequired:  t.pv_required,
          totalPvFulfilled: t.pv_fulfilled,
          totalPvRemaining: t.pv_required - t.pv_fulfilled,
          months:           [monthEntry],
        });
      } else {
        existing.totalPvRequired  += t.pv_required;
        existing.totalPvFulfilled += t.pv_fulfilled;
        existing.totalPvRemaining += (t.pv_required - t.pv_fulfilled);
        existing.months.push(monthEntry);
      }
    }

    let data = Array.from(userMap.values());

    // ── Enrich all rows with User details in one batch ────────────
    if (data.length > 0) {
      const userIds = data.map((r) => r.user_id);

      const users = await User.find({ user_id: { $in: userIds } })
        .select(
          "user_id user_name name contact mail rank club refer_by infinity profile"
        )
        .lean() as any[];

      // Build lookup map
      const userLookup = new Map<string, any>();
      for (const u of users) {
        userLookup.set(u.user_id, u);
      }

      // Attach user details to each row
      data = data.map((row) => {
        const u = userLookup.get(row.user_id);
        if (!u) return row;

        return {
          ...row,
          user_name: u.user_name || u.name || "—",
          contact:   u.contact   || "—",
          mail:      u.mail      || "—",
          rank:      u.rank      || "none",
          club:      u.club      || "none",
          refer_by:  u.refer_by  || "—",
          infinity:  u.infinity  || "—",
          profile:   u.profile   || null,
        };
      });
    }

    // ── Search ────────────────────────────────────────────────────
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.user_id.toLowerCase().includes(s)   ||
          r.user_name.toLowerCase().includes(s) ||
          r.contact.toLowerCase().includes(s)
      );
    }

    // ── Date filter on month ──────────────────────────────────────
    if (date) {
      data = data.filter((r) =>
        r.months.some((m: any) => m.month === date)
      );
    } else if (from && to) {
      data = data.filter((r) =>
        r.months.some((m: any) => m.month >= from && m.month <= to)
      );
    }

    return NextResponse.json({
      success: true,
      type:    "list",
      data,
    });

  } catch (err: any) {
    console.error("PV Tracker API error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}