import axios from "axios";
import { pdf } from "@react-pdf/renderer";
import InvoiceTemplate from "@/components/PDF/template";

export async function handleDownloadPDF(order_id, setLoading) {
  try {
    if (setLoading) setLoading(true);

    // Fetch order data
    const { data } = await axios.get(`/api/order-operations?id=${order_id}`);
    console.log(data)
    const order = data?.data[0];
    if (!order) throw new Error("Order not found");

    // Generate PDF
    const blob = await pdf(<InvoiceTemplate data={order} />).toBlob();

    // Download file
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
