import axios from "axios";
import { pdf } from "@react-pdf/renderer";
import InvoiceTemplate from "@/components/PDF/template";

export async function handleDownloadPDF(order_id, setLoading) {
  try {
    if (setLoading) setLoading(true);

    // 🔹 Fetch order data
    const orderRes = await axios.get(`/api/order-operations?id=${order_id}`);
    const order = orderRes?.data?.data?.[0];
    if (!order) throw new Error("Order not found");

    // 🔹 Fetch office details
    const officeRes = await axios.get(`/api/office-operations`);
    const office = officeRes?.data?.data;

    // 🔹 Combine order + office
    const pdfData = {
      order,
      office,
    };

    // 🔹 Generate PDF
    const blob = await pdf(
      <InvoiceTemplate data={pdfData} />
    ).toBlob();

    // 🔹 Download file
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Invoice_${order.order_id}.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Error generating invoice:", err);
  } finally {
    if (setLoading) setLoading(false);
  }
}
