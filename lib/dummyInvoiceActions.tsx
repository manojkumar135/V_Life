import axios from "axios";
import { pdf } from "@react-pdf/renderer";
import InvoiceTemplate from "@/components/PDF/template";

/**
 * Convert history + user → invoice-compatible object
 */
function mapHistoryToInvoice(record: any, user: any) {
  const amount = Number(record.amount || 0);
  console.log(record,user)

  return {
    // invoice header
    order_id: record.transaction_id,
    payment_date: record.date,
    order_type: "N/A",

    // GST optional
    gst_no: user?.gst || user?.gst_no || "N/A",

    // user (priority: user API > history)
    user_id: record.user_id,
    user_name: user?.name || record.user_name || "-",
    mail:  user?.mail || record.email || "",
    contact: user?.contact || user?.phone || record.mobile || "",
    address: user?.address || "8/165-111/C, LAKE VIEW ROAD, BC RAMAIAH ST, FIRST LANE, RAJEEVNAGAR, ONGOLE, AP - 523002.",

    // Product Entry
    items: [
      {
        name: "Cloth",
        product_code: "ADV-001",
        hsn_code: "9997",
        quantity: 1,
        dealer_price: 10000,
        whole_gst: 0,
        gst: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        gst_amount: 0,
      },
    ],

    // invoice totals
    total_amount: amount,
    total_gst: 0,
    final_amount: amount,

    // template signals
    is_first_order: false,
    // advance_deducted: amount,
  };
}

/**
 * 🟢 PREVIEW PDF
 */
export async function dummyPreviewPDF(
  transaction_id: string,
  setLoading: (v: boolean) => void,
  setPreviewUrl: (url: string | null) => void
) {
  try {
    setLoading(true);

    // 1. History record
    const { data: historyRes } = await axios.get(`/api/history-operations?id=${transaction_id}`);
    const record = historyRes?.data?.[0];
    if (!record) throw new Error("History record not found");

    // 2. User record
    const { data: userRes } = await axios.get(`/api/users-operations?user_id=${record.user_id}`);
    const user = userRes?.data || {};
    // console.log(userRes)

    const invoiceData = mapHistoryToInvoice(record, user);

    // generate pdf + preview
    const blob = await pdf(<InvoiceTemplate data={invoiceData} />).toBlob();
    const url = URL.createObjectURL(blob);

    setPreviewUrl(url);

  } catch (error) {
    console.error("Dummy invoice preview error:", error);
  } finally {
    setLoading(false);
  }
}

/**
 * 📥 DOWNLOAD PDF
 */
export async function dummyDownloadPDF(
  transaction_id: string,
  setLoading?: (v: boolean) => void
) {
  try {
    if (setLoading) setLoading(true);

    // 1. history
    const { data: historyRes } = await axios.get(`/api/history-operations?id=${transaction_id}`);
    const record = historyRes?.data?.[0];
    if (!record) throw new Error("History record not found");

    // 2. user
    const { data: userRes } = await axios.get(`/api/users-operations?user_id=${record.user_id}`);
    const user = userRes?.data|| {};

    const invoiceData = mapHistoryToInvoice(record, user);

    const blob = await pdf(<InvoiceTemplate data={invoiceData} />).toBlob();

    // download file
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `AdvanceInvoice_${record.user_id}_${record.date}.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Dummy invoice download error:", error);
  } finally {
    if (setLoading) setLoading(false);
  }
}
