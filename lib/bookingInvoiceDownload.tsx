// lib/bookingInvoiceDownload.tsx
// Mirrors lib/invoiceDownload.tsx exactly — swap order → booking, InvoiceTemplate → BookingInvoiceTemplate

import axios from "axios";
import { pdf } from "@react-pdf/renderer";
import BookingInvoiceTemplate from "@/components/PDF/BookingInvoiceTemplate";

export async function handleDownloadBookingPDF(
  booking_id: string,
  setLoading?: (val: boolean) => void
) {
  try {
    if (setLoading) setLoading(true);

    // 🔹 Fetch booking
    const bookingRes = await axios.get(`/api/booking-operations?id=${booking_id}`);
    const booking    = bookingRes?.data?.data;
    if (!booking) throw new Error("Booking not found");

    // 🔹 Fetch office details
    const officeRes = await axios.get(`/api/office-operations`);
    const office    = officeRes?.data?.data;

    // 🔹 Combine booking + office
    const pdfData = { booking, office };

    // 🔹 Generate PDF blob
    const blob = await pdf(
      <BookingInvoiceTemplate data={pdfData} />
    ).toBlob();

    // 🔹 Trigger download
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `Booking_Invoice_${booking.booking_id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Booking invoice download error:", err);
  } finally {
    if (setLoading) setLoading(false);
  }
}