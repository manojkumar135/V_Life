// lib/invoicePreview.tsx
import axios from "axios";
import { pdf } from "@react-pdf/renderer";
import InvoiceTemplate from "@/components/PDF/template";

export async function handlePreviewPDF(
  order_id: string,
  setLoading: (val: boolean) => void,
  setPreviewUrl: (url: string | null) => void
) {
  try {
    setLoading(true);

    // 🔹 Fetch order
    const orderRes = await axios.get(`/api/order-operations?id=${order_id}`);
    const order = orderRes?.data?.data?.[0];
    if (!order) throw new Error("Order not found");

    // 🔹 Fetch office
    const officeRes = await axios.get(`/api/office-operations`);
    const office = officeRes?.data?.data;

    // 🔹 Combine both
    const pdfData = {
      order,
      office,
    };

    // 🔹 Generate PDF
    const blob = await pdf(
      <InvoiceTemplate data={pdfData} />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
  } catch (error) {
    console.error("Preview Error:", error);
  } finally {
    setLoading(false);
  }
}
