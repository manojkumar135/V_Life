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

    const { data } = await axios.get(`/api/order-operations?id=${order_id}`);
    const order = data?.data?.[0];
    if (!order) throw new Error("Order not found");

    // generate pdf blob
    const blob = await pdf(<InvoiceTemplate data={order} />).toBlob();
    const url = URL.createObjectURL(blob);

    setPreviewUrl(url);
  } catch (error) {
    console.error("Preview Error:", error);
  } finally {
    setLoading(false);
  }
}
