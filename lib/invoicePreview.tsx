import axios from "axios";
import { pdf } from "@react-pdf/renderer";
import InvoiceTemplate from "@/components/PDF/template";
import * as pdfjsLib from "pdfjs-dist";

export async function handlePreviewPDF(
  order_id: string,
  setLoading: (val: boolean) => void,
  setPreviewUrl: (url: string | null) => void
) {
  try {
    setLoading(true);

    // Set up the worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const { data } = await axios.get(`/api/order-operations?id=${order_id}`);
    const order = data?.data?.[0];
    if (!order) throw new Error("Order not found");

    const blob = await pdf(<InvoiceTemplate data={order} />).toBlob();
    const url = URL.createObjectURL(blob);

    setPreviewUrl(url);
  } catch (error) {
    console.error("Preview Error:", error);
  } finally {
    setLoading(false);
  }
}