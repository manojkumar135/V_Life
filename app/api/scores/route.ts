import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Score } from "@/models/score"; // adjust if your Score model path differs

// ✅ GET - Fetch score/reward data for a user
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const user_id   = searchParams.get("user_id")   || "";
    const type      = searchParams.get("type")      || "daily";  // daily | fortnight | cashback | reward
    const direction = searchParams.get("direction") || "";        // "in" | "out" | "" (both)
    const search    = searchParams.get("search")    || "";        // search across reference_id, source, remarks
    const date      = searchParams.get("date")      || "";        // single date  e.g. "2026-01-25"
    const from      = searchParams.get("from")      || "";        // range start
    const to        = searchParams.get("to")        || "";        // range end

    const validTypes = ["daily", "fortnight", "cashback", "reward"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, message: "Invalid type. Must be daily | fortnight | cashback | reward" },
        { status: 400 }
      );
    }

    // ── Build MongoDB query ──────────────────────────────────────────
    // user_id is always required to find the score document
    const query: any = {};
    if (user_id) {
      query.user_id = user_id;
    }

    const doc = await Score.findOne(query).lean() as any;

    if (!doc) {
      return NextResponse.json(
        { success: false, message: "Score record not found" },
        { status: 404 }
      );
    }

    const wallet = (doc as any)[type] ?? {};

    // ── Summary (always from the DB totals, unaffected by filters) ───
    const summary = {
      earned:  wallet.earned  ?? 0,
      used:    wallet.used    ?? 0,
      balance: wallet.balance ?? 0,
    };

    // ── History ──────────────────────────────────────────────────────
    const inHistory:  any[] = wallet.history?.in  ?? [];
    const outHistory: any[] = wallet.history?.out ?? [];

    // Tag each entry with direction
    const taggedIn  = inHistory .map((h: any) => ({ ...h, direction: "in"  }));
    const taggedOut = outHistory.map((h: any) => ({ ...h, direction: "out" }));

    // ── Direction filter ──────────────────────────────────────────────
    let merged: any[] = [];
    if (!direction || direction === "in")  merged = [...merged, ...taggedIn];
    if (!direction || direction === "out") merged = [...merged, ...taggedOut];

    // ── Search filter (reference_id, source, module, remarks) ─────────
    if (search) {
      const term = search.trim().toLowerCase();
      merged = merged.filter((item) => {
        const referenceId = (item.reference_id ?? "").toLowerCase();
        const source      = (item.source       ?? "").toLowerCase().replace(/_/g, " ");
        const module_     = (item.module        ?? "").toLowerCase().replace(/_/g, " ");
        const remarks     = (item.remarks       ?? "").toLowerCase();

        return (
          referenceId.includes(term) ||
          source     .includes(term) ||
          module_    .includes(term) ||
          remarks    .includes(term)
        );
      });
    }

    // ── Date filter: single date ──────────────────────────────────────
    if (date && !from && !to) {
      const target = new Date(date);
      merged = merged.filter((item) => {
        const d = new Date(item.created_at);
        return (
          d.getFullYear() === target.getFullYear() &&
          d.getMonth()    === target.getMonth()    &&
          d.getDate()     === target.getDate()
        );
      });
    }

    // ── Date filter: range ────────────────────────────────────────────
    if (from || to) {
      merged = merged.filter((item) => {
        const d = new Date(item.created_at);
        if (from && d < new Date(from))                  return false;
        if (to   && d > new Date(to + "T23:59:59.999Z")) return false;
        return true;
      });
    }

    // ── Sort newest first ─────────────────────────────────────────────
    merged.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json(
      { success: true, summary, history: merged, total: merged.length },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch score data" },
      { status: 500 }
    );
  }
}