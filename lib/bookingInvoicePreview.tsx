// lib/bookingInvoicePreview.tsx
// Mirrors lib/invoicePreview.tsx exactly — swap order → booking, InvoiceTemplate → BookingInvoiceTemplate

import axios from "axios";
import { pdf } from "@react-pdf/renderer";
import BookingInvoiceTemplate from "@/components/PDF/BookingInvoiceTemplate";

export async function handlePreviewBookingPDF(
  booking_id: string,
  setLoading: (val: boolean) => void,
  setPreviewUrl: (url: string | null) => void
) {
  try {
    setLoading(true);

    // 🔹 Fetch booking (same pattern as order fetch in invoicePreview)
    const bookingRes = await axios.get(`/api/booking-operations?id=${booking_id}`);
    const booking    = bookingRes?.data?.data;
    if (!booking) throw new Error("Booking not found");

    // 🔹 Fetch office details (same as invoicePreview)
    const officeRes = await axios.get(`/api/office-operations`);
    const office    = officeRes?.data?.data;

    // 🔹 Combine booking + office
    const pdfData = { booking, office };

    // 🔹 Generate PDF blob using BookingInvoiceTemplate
    const blob = await pdf(
      <BookingInvoiceTemplate data={pdfData} />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
  } catch (error) {
    console.error("Booking Preview Error:", error);
  } finally {
    setLoading(false);
  }
}