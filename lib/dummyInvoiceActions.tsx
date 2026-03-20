import axios from "axios";
import { pdf } from "@react-pdf/renderer";
import InvoiceTemplate from "@/components/PDF/template";

/**
 * Convert history + user + office → invoice-compatible object
 * (WITHOUT touching InvoiceTemplate)
 */
function mapHistoryToInvoice(record: any, user: any, office: any) {
  const amount = Number(record.amount || 0);

  return {
    order: {
      order_id: record.transaction_id,
      payment_date: record.date,
      order_type: record.source === "advance" ? "ADVANCE" : "N/A",

      gst_no: user?.gst || user?.gst_no || "N/A",

      user_id: record.user_id,
      user_name: user?.name || record.user_name || "-",
      mail: user?.mail || record.email || "",
      contact: user?.contact || user?.phone || record.mobile || "",
      address:
        user?.address ||
        "8/165-111/C, LAKE VIEW ROAD, BC RAMAIAH ST, FIRST LANE, RAJEEVNAGAR, ONGOLE, AP - 523002.",

      items: [
        {
          name: "VITA SHIELD 10 Pack",
          product_code: "VITASHIELD10",
          hsn_code: "3004",
          quantity: 1,
          dealer_price: 14285.71,
          whole_gst: 714.29,
          gst: 5.0,
          cgst: 2.5,
          sgst:2.5,
          igst: 5.0,
          gst_amount:714.29 ,
        },
      ],

      total_amount: amount,
      total_gst:714.29,
      final_amount: amount,

      reward_used: 0,
      reward_usage: {},

      is_first_order: false,
    },

    office, // keep full office object
  };
}

/* =========================================================
   🟢 PREVIEW PDF
========================================================= */
export async function dummyPreviewPDF(
  transaction_id: string,
  setLoading: (v: boolean) => void,
  setPreviewUrl: (url: string | null) => void
) {
  try {
    setLoading(true);

    // 1️⃣ History
    const { data: historyRes } = await axios.get(
      `/api/history-operations?id=${transaction_id}`
    );
    const record = historyRes?.data?.[0];
    if (!record) throw new Error("History record not found");

    // 2️⃣ User
    const { data: userRes } = await axios.get(
      `/api/users-operations?user_id=${record.user_id}`
    );
    const user = userRes?.data || {};

    // 3️⃣ Office
    const { data: officeRes } = await axios.get(`/api/office-operations`);
    const office = officeRes?.data || {};
// console.log("office in dummyInvoiceActions:", office,officeRes);
    // 🔥 CRITICAL FIX — inject global office (NO template edit)
    (globalThis as any).office = office;

    // 4️⃣ Map data
    const invoiceData = mapHistoryToInvoice(record, user, office);

    // 5️⃣ Generate PDF
    const blob = await pdf(
      <InvoiceTemplate data={invoiceData} />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
  } catch (error) {
    console.error("Dummy invoice preview error:", error);
  } finally {
    setLoading(false);
  }
}

/* =========================================================
   📥 DOWNLOAD PDF
========================================================= */
export async function dummyDownloadPDF(
  transaction_id: string,
  setLoading?: (v: boolean) => void
) {
  try {
    if (setLoading) setLoading(true);

    // 1️⃣ History
    const { data: historyRes } = await axios.get(
      `/api/history-operations?id=${transaction_id}`
    );
    const record = historyRes?.data?.[0];
    if (!record) throw new Error("History record not found");

    // 2️⃣ User
    const { data: userRes } = await axios.get(
      `/api/users-operations?user_id=${record.user_id}`
    );
    const user = userRes?.data || {};

    // 3️⃣ Office
    const { data: officeRes } = await axios.get(`/api/office-operations`);
    const office = officeRes?.data?.data || {};

    // 🔥 SAME FIX HERE
    (globalThis as any).office = office;

    // 4️⃣ Map
    const invoiceData = mapHistoryToInvoice(record, user, office);

    // 5️⃣ Generate PDF
    const blob = await pdf(
      <InvoiceTemplate data={invoiceData} />
    ).toBlob();

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
