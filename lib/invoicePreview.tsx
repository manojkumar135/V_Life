import axios from "axios";
import { pdf } from "@react-pdf/renderer";
import InvoiceTemplate from "@/components/PDF/template";

export async function handlePreviewPDF(order_id: string) {
  const { data } = await axios.get(`/api/order-operations?id=${order_id}`);
  const order = data?.data?.[0];
  if (!order) throw new Error("Order not found");

  const blob = await pdf(<InvoiceTemplate data={order} />).toBlob();
  return URL.createObjectURL(blob);
}
