import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Office } from "@/models/office";

export async function GET() {
  try {
    await connectDB();

    const office = await Office.findOne();

    return NextResponse.json({
      success: true,
      data: office || null,
    });
  } catch (error: any) {
    console.error("GET /api/office-operations error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Server error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    // Normalize payload & always update updated_at
    const updateData: any = {
      ...body,
      updated_at: new Date(),
    };

    let office = await Office.findOne();

    if (!office) {
      // create first office record
      office = await Office.create(updateData);
    } else {
      await Office.updateOne({}, { $set: updateData });
    }

    return NextResponse.json({
      success: true,
      message: "Office address saved successfully",
    });
  } catch (error: any) {
    console.error("PATCH /api/office-operations error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Update failed",
      },
      { status: 500 }
    );
  }
}
