import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import NewPop from "@/models/NewPop";

/* =====================================================
   GET – Fetch settings (frontend)
===================================================== */
export async function GET() {
  try {
    await connectDB();

    const data = await NewPop.findOne().lean();

    return NextResponse.json({
      success: true,
      data: data || null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Fetch failed" },
      { status: 500 }
    );
  }
}

/* =====================================================
   POST – Create initial settings (ADMIN – FIRST TIME)
===================================================== */
export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const exists = await NewPop.findOne();
    if (exists) {
      return NextResponse.json(
        { success: false, message: "Settings already exist" },
        { status: 400 }
      );
    }

    const created = await NewPop.create(body);

    return NextResponse.json({
      success: true,
      message: "Settings created",
      data: created,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Create failed" },
      { status: 500 }
    );
  }
}

/* =====================================================
   PUT – Replace settings (ADMIN SAVE)
===================================================== */
export async function PUT(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const updated = await NewPop.findOneAndUpdate(
      {},
      body,
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Settings saved",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Update failed" },
      { status: 500 }
    );
  }
}

/* =====================================================
   PATCH – Partial update (ADMIN toggle / text only)
===================================================== */
export async function PATCH(req: Request) {
  try {
    await connectDB();

    const updates = await req.json();

    const updated = await NewPop.findOneAndUpdate(
      {},
      { $set: updates },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Settings updated",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Patch failed" },
      { status: 500 }
    );
  }
}
