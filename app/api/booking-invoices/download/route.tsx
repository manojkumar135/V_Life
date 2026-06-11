// app/api/booking-invoices/download/route.tsx
import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import BookingInvoiceTemplate from "@/components/PDF/BookingInvoiceTemplate";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/bookings";
import {Office} from "@/models/office"; 

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingsParam = searchParams.get("bookings");

    if (!bookingsParam) {
      return NextResponse.json(
        { error: "No booking ids provided" },
        { status: 400 }
      );
    }

    const bookingIds = bookingsParam.split(",");

    await connectDB();

    // ✅ Fetch office directly from DB — no HTTP call
    const office = await Office.findOne({}).lean();

    const invoicesData: any[] = [];

    for (const booking_id of bookingIds) {
      try {
        // ✅ Fetch booking directly from DB — no HTTP call, no env var issues
        const booking = await Booking.findOne({ booking_id }).lean();

        if (!booking) {
          console.log("Booking not found:", booking_id);
          continue;
        }

        invoicesData.push({ booking, office });
      } catch (err) {
        console.error("Skipping booking:", booking_id, err);
      }
    }

    if (invoicesData.length === 0) {
      return NextResponse.json(
        { error: "No valid bookings found" },
        { status: 404 }
      );
    }

    const blob = await pdf(
      <BookingInvoiceTemplate data={invoicesData} isBulk />
    ).toBlob();

    const arrayBuffer = await blob.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=all_booking_invoices.pdf`,
      },
    });
  } catch (error) {
    console.error("Merged booking PDF error:", error);
    return NextResponse.json(
      { error: "Failed to generate merged PDF" },
      { status: 500 }
    );
  }
}