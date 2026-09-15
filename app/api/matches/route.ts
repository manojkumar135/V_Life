import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { get60DayStats } from "@/services/cycles";
import { DailyPayout } from "@/models/payout";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const user_id = searchParams.get("user_id");
    const search = searchParams.get("search") || "";
        const from = searchParams.get("from");
    const to = searchParams.get("to");
    const date = searchParams.get("date");
    const minMatchesParam = searchParams.get("min_matches");
    const minMatches =
      minMatchesParam !== null && minMatchesParam !== ""
        ? Number(minMatchesParam)
        : null;

    // ── Build user query ──────────────────────────────────────────
    // const userQuery: any = {};
    const userQuery: any = {
      user_status: { $regex: /^active$/i },
    };

    // Search across user fields
    if (search) {
      userQuery.$or = [
        { user_id: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
      ];
    }

    // Date filter on activated_date
    // if (date) {
    //   userQuery.activated_date = date;
    // } else if (from && to) {
    // }

    const users = await User.find(userQuery)
      .select("user_id user_name contact activation_date created_at")
      .lean();

    const hasDateFilter = Boolean(date || (from && to));
    const matchCounts = new Map<
      string,
      { matches: number; matchingBonus: number }
    >();

    if (hasDateFilter) {
      const start = new Date(`${date || from}T00:00:00.000Z`);
      const end = new Date(`${date || to}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);

      const payouts = await DailyPayout.aggregate([
        {
          $match: {
            user_id: { $in: users.map((user: any) => user.user_id) },
            name: "Matching Bonus",
            created_at: {
              $gte: start,
              $lt: end,
            },
          },
        },
        {
          $group: {
            _id: "$user_id",
            matches: { $sum: 1 },
            matchingBonus: { $sum: "$amount" },
          },
        },
      ]);

      payouts.forEach((payout) => {
        matchCounts.set(payout._id, {
          matches: payout.matches,
          matchingBonus: payout.matchingBonus,
        });
      });
    }

    // ── Build per-user cycle stats ────────────────────────────────
    const results = await Promise.all(
      users.map(async (u: any) => {
        try {
          const stats = await get60DayStats(u.user_id);

          // Parse activation date for display
          let activation_date = "";
          if (u.activated_date) {
            activation_date = u.activated_date; // already "DD-MM-YYYY"
          } else if (u.created_at) {
            const d = new Date(u.created_at);
            activation_date = `${String(d.getDate()).padStart(2, "0")}-${String(
              d.getMonth() + 1,
            ).padStart(2, "0")}-${d.getFullYear()}`;
          }

          const rangeStats = matchCounts.get(u.user_id);
          //   console.log(u)
          return {
            user_id: u.user_id,
            user_name: u.user_name || "—",
            contact: u.contact || "—",
            activation_date,
            cycleIndex: stats.cycleIndex,
            cycleStart: stats.cycleStart,
            cycleEnd: stats.cycleEnd,
            daysPassed: stats.daysPassed,
            remainingDays: stats.remainingDays,
            matches: hasDateFilter ? (rangeStats?.matches ?? 0) : stats.matches,
            matchingBonus: hasDateFilter
              ? (rangeStats?.matchingBonus ?? 0)
              : stats.matchingBonus,
          };
        } catch {
          return null;
        }
      }),
    );

        // Filter nulls + sort by matches in descending order
    let data = (results.filter(Boolean) as any[]).sort(
      (a, b) => (b.matches ?? 0) - (a.matches ?? 0),
    );

    if (minMatches !== null) {
      data = data.filter((r) => (r.matches ?? 0) >= minMatches);
    }

    // if (from && to) {
    //   const fromDate = new Date(from);
    //   const toDate = new Date(to);
    //   data = data.filter((r) => {
    //     const cs = new Date(r.cycleStart);
    //     return cs >= fromDate && cs <= toDate;
    //   });
    // }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Matches API error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 },
    );
  }
}
