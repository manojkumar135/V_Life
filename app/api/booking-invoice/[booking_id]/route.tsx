// app/api/booking-invoice/[booking_id]/route.tsx
import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import BookingInvoiceTemplate from "@/components/PDF/BookingInvoiceTemplate";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/bookings";
import { Office } from "@/models/office";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ booking_id: string }> },
) {
  try {
    const { booking_id } = await params;

    if (!booking_id) {
      return NextResponse.json(
        { error: "No booking id provided" },
        { status: 400 },
      );
    }

    await connectDB();

    // ✅ Direct DB queries — no axios, no env var issues
    const [booking, office] = await Promise.all([
      Booking.findOne({ booking_id }).lean(),
      Office.findOne({}).lean(),
    ]);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const blob = await pdf(
      <BookingInvoiceTemplate data={{ booking, office }} />,
    ).toBlob();

    const arrayBuffer = await blob.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="booking-${booking_id}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Booking invoice error:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 },
    );
  }
}
