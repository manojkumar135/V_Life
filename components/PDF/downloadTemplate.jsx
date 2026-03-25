import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";

const BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BASE_URL || "";

Font.register({
  family: "Roboto",
  fonts: [
    { src: `${BASE_URL}/fonts/Roboto/Roboto-Regular.ttf` },
    { src: `${BASE_URL}/fonts/Roboto/Roboto-Bold.ttf`, fontWeight: "bold" },
  ],
});

const BORDER = "0.7 solid #000";

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 9,
    fontFamily: "Roboto",
    color: "#000",
  },
  headerBox: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: { flexDirection: "column", width: "50%" },
  logo: { width: 120, height: 50, marginRight: 8, marginLeft: 10 },
  taxBox: {
    width: "28%",
    border: BORDER,
    padding: 4,
    paddingRight: 5,
    paddingLeft: 5,
    height: 48,
  },
  taxHeading: { textAlign: "center", fontWeight: "bold", marginBottom: 3 },
  taxLine: { flexDirection: "row", justifyContent: "space-between" },
  separator: { borderBottom: BORDER, marginVertical: 6 },
  addressContainer: { flexDirection: "row", border: BORDER },
  colLeft: { width: "70%", borderRight: BORDER, padding: 4 },
  colRight: { width: "30%", padding: 4 },
  sectionTitle: {
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 3,
    fontSize: 10,
  },
  label: { fontWeight: "bold", marginLeft: 2, marginRight: 2 },
  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#2E2E2E",
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 18,
    marginBottom: 15,
    borderRadius: 2,
  },
  row: { flexDirection: "row" },
  col: {
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#2E2E2E",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
    fontSize: 8.5,
  },
  headerCol: { fontWeight: "bold", textAlign: "center" },
  cNo: { width: "4%" },
  cCode: { width: "10%" },
  cName: { width: "20%" },
  cHSN: { width: "10%" },
  cQty: { width: "5%" },
  cPrice: { width: "12%" },
  cTaxable: { width: "10%" },
  cGST: { width: "6%" },
  cTotal: { width: "15%" },
  totalsSection: {
    width: "55%",
    alignSelf: "flex-end",
    marginTop: 10,
    padding: 6,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalsBottomBorder: {
    borderBottom: BORDER,
    paddingBottom: 3,
    marginBottom: 4,
  },
  deduction: { color: "red", fontSize: 9 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    borderTop: "1 solid #ccc",
    textAlign: "center",
    fontSize: 9,
    color: "#555",
    paddingTop: 8,
  },
  pageNumber: {
    position: "absolute",
    bottom: 10,
    right: 20,
    fontSize: 8,
  },
  // ✅ NEW: invoice counter badge for bulk PDFs
  invoiceBadge: {
    position: "absolute",
    bottom: 10,
    left: 20,
    fontSize: 8,
    color: "#555",
  },
});

// ─── Single invoice page ────────────────────────────────────────────────────
function InvoicePage({ invoice, invoiceIndex, totalInvoices, isBulk }) {
  return (
    <Page
      size="A4"
      style={[styles.page, { marginLeft: 1, marginRight: 1 }]}
    >
      {/* ---------- HEADER ---------- */}
      <View style={styles.headerBox}>
        <View style={styles.headerLeft}>
          <Image
            src="https://res.cloudinary.com/df2vugog5/image/upload/v1773936754/maverick-logo_ao66bd.png"
            style={styles.logo}
          />
        </View>

        <View style={styles.taxBox}>
          <Text style={styles.taxHeading}>TAX INVOICE</Text>
          <View style={[styles.taxLine, { marginTop: 2 }]}>
            <Text>Invoice No :</Text>
            <Text>{invoice.order?.order_id || "N/A"}</Text>
          </View>
          <View style={[styles.taxLine, { marginTop: 2 }]}>
            <Text>Invoice Date :</Text>
            <Text>{invoice.order?.payment_date || "N/A"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.separator} />

      <Text style={[styles.label, { marginTop: 2 }]}>
        FROM :{" "}
        <Text style={{ fontWeight: "normal" }}>
          Maverick Signature Network PVT Ltd
        </Text>
      </Text>

      <View style={{ marginLeft: 3 }}>
        <Text>
          {invoice.office?.office_street}
          {invoice.office?.office_landmark
            ? `, ${invoice.office.office_locality}`
            : ""}
          {invoice.office?.office_city
            ? `, ${invoice.office.office_state}`
            : ""}
          {invoice.office?.office_country
            ? ` - ${invoice.office.office_pincode}`
            : ""}
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 5,
            marginBottom: 5,
          }}
        >
          <Text>
            <Text style={{ fontWeight: "bold" }}>{"Email : "}</Text>
            {invoice.office?.office_email || "—"}
          </Text>
          <Text>
            <Text style={{ fontWeight: "bold" }}>{"Contact : "}</Text>
            {invoice.office?.office_contact || "—"}
          </Text>
          <Text>
            <Text style={{ fontWeight: "bold" }}>{"GSTIN : "}</Text>
            {invoice.office?.office_gst_number || "—"}
          </Text>
        </View>
      </View>

      {/* ================= ADDRESS TABLE ================= */}
      <View style={styles.addressContainer}>
        <View style={styles.colLeft}>
          <Text style={[styles.sectionTitle, { margin: 5 }]}>
            SHIPPING ADDRESS
          </Text>
          <View style={{ flexDirection: "row", margin: 5 }}>
            <Text style={styles.label}>USER NAME  :</Text>
            <Text>{invoice.order?.user_name || "N/A"}</Text>
          </View>
          <View style={{ marginLeft: 5 }}>
            <Text style={styles.label}>ADDRESS  :</Text>
            <Text
              style={{
                margin: 5,
                marginLeft: 10,
                textTransform: "capitalize",
                fontSize: 9,
                marginBottom: 30,
              }}
            >
              {invoice.order?.address || "N/A"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", marginTop: 5, marginLeft: 5 }}>
            <Text style={styles.label}>Email  :</Text>
            <Text>{invoice.order?.mail || "N/A"}</Text>
          </View>
          <View style={{ flexDirection: "row", marginTop: 5, marginLeft: 5 }}>
            <Text style={styles.label}>Contact  :</Text>
            <Text>{invoice.order?.contact || "N/A"}</Text>
          </View>
        </View>

        <View style={styles.colRight}>
          <Text style={[styles.sectionTitle, { margin: 5 }]}>
            ORDER DETAILS
          </Text>
          <View style={{ flexDirection: "row", margin: 5 }}>
            <Text style={styles.label}>USER ID  :</Text>
            <Text>{invoice.order?.user_id || "N/A"}</Text>
          </View>
          <View style={{ flexDirection: "row", margin: 5 }}>
            <Text style={styles.label}>ORDER NO  :</Text>
            <Text>{invoice.order?.order_id || "N/A"}</Text>
          </View>
          <View style={{ flexDirection: "row", margin: 5 }}>
            <Text style={styles.label}>GST :</Text>
            <Text>{invoice.order?.gst_no || "N/A"}</Text>
          </View>
          <View style={{ flexDirection: "row", margin: 5 }}>
            <Text style={styles.label}>Order Type  : PV OR BV</Text>
          </View>
        </View>
      </View>

      {/* ---------- PRODUCT TABLE ---------- */}
      <View style={styles.table}>
        {/* Header row */}
        <View style={styles.row}>
          <Text style={[styles.col, styles.headerCol, styles.cNo]}>S. No</Text>
          <Text style={[styles.col, styles.headerCol, styles.cCode]}>
            Product Code
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cName]}>
            Product Name
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cHSN]}>
            HSN/SAC code
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cQty]}>Qty</Text>
          <Text style={[styles.col, styles.headerCol, styles.cPrice]}>
            Unit Price (₹)
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cTaxable]}>
            Taxable Amount
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cGST]}>
            CGST (%)
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cGST]}>
            SGST (%)
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cGST]}>
            IGST (%)
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cTotal]}>
            Total (₹)
          </Text>
        </View>

        {/* Data rows */}
        {invoice.order?.items?.map((product, idx) => {
          const dealerPrice = product.dealer_price || 0;
          const gstAmount = product.gst_amount || 0;
          const quantity = product.quantity || 1;
          const total = (dealerPrice + gstAmount) * quantity;
          const taxableAmount =
            product.whole_gst ||
            (dealerPrice * (product.gst_rate || 0)) / 100 ||
            0;

          return (
            <View key={idx} style={styles.row}>
              <Text style={[styles.col, styles.cNo, { textAlign: "right" }]}>
                {idx + 1}
              </Text>
              <Text
                style={[styles.col, styles.cCode, { textAlign: "center" }]}
              >
                {product.product_code || ""}
              </Text>
              <Text
                style={[
                  styles.col,
                  styles.cName,
                  { textTransform: "capitalize" },
                ]}
              >
                {product.name || ""}
              </Text>
              <Text
                style={[styles.col, styles.cHSN, { textAlign: "center" }]}
              >
                {product.hsn_code || ""}
              </Text>
              <Text
                style={[styles.col, styles.cQty, { textAlign: "center" }]}
              >
                {quantity}
              </Text>
              <Text
                style={[styles.col, styles.cPrice, { textAlign: "right" }]}
              >
                {`\u20B9 ${dealerPrice.toFixed(2)}`}
              </Text>
              <Text
                style={[styles.col, styles.cTaxable, { textAlign: "right" }]}
              >
                {`\u20B9 ${taxableAmount.toFixed(2)}`}
              </Text>
              <Text
                style={[styles.col, styles.cGST, { textAlign: "right" }]}
              >
                {product.cgst?.toFixed(1) || "0"}
              </Text>
              <Text
                style={[styles.col, styles.cGST, { textAlign: "right" }]}
              >
                {product.sgst?.toFixed(1) || "0"}
              </Text>
              <Text
                style={[styles.col, styles.cGST, { textAlign: "right" }]}
              >
                {product.igst?.toFixed(1) || "0"}
              </Text>
              <Text
                style={[styles.col, styles.cTotal, { textAlign: "right" }]}
              >
                {`\u20B9 ${total.toFixed(2)}`}
              </Text>
            </View>
          );
        })}
      </View>

      {/* ---------- TOTAL SECTION ---------- */}
      <View style={styles.totalsSection}>
        <View style={styles.totalsRow}>
          <Text>Total Before Tax</Text>
          <Text>{`\u20B9 ${(
            (invoice.order?.total_amount || 0) -
            (invoice.order?.total_gst || 0)
          ).toFixed(2)}`}</Text>
        </View>

        <View style={styles.totalsRow}>
          <Text>Add GST</Text>
          <Text>{`\u20B9 ${(invoice.order?.total_gst || 0).toFixed(2)}`}</Text>
        </View>

        {invoice.order?.is_first_order &&
          invoice.order?.advance_deducted > 0 && (
            <View style={styles.totalsRow}>
              <Text>Advance Deducted:</Text>
              <Text style={styles.deduction}>
                {`- \u20B9 ${(invoice.order.advance_deducted || 0).toFixed(2)}`}
              </Text>
            </View>
          )}

        {invoice.order?.reward_used > 0 && (
          <>
            {invoice.order?.reward_usage?.cashback?.used > 0 && (
              <View style={styles.totalsRow}>
                <Text>Cashback</Text>
                <Text style={styles.deduction}>
                  {`- \u20B9 ${(
                    invoice.order.reward_usage.cashback.used || 0
                  ).toFixed(2)}`}
                </Text>
              </View>
            )}
            {(invoice.order?.reward_usage?.daily?.used > 0 ||
              invoice.order?.reward_usage?.fortnight?.used > 0) && (
              <View style={styles.totalsRow}>
                <Text>Reward Points</Text>
                <Text style={styles.deduction}>
                  {`- \u20B9 ${(invoice.order.reward_used || 0).toFixed(2)}`}
                </Text>
              </View>
            )}
          </>
        )}

        <View style={styles.totalsBottomBorder} />

        <View style={styles.totalsRow}>
          <Text style={{ fontWeight: "bold", fontSize: 10 }}>Grand Total</Text>
          <Text style={{ fontWeight: "bold", fontSize: 10 }}>
            {`\u20B9 ${(invoice.order?.final_amount || 0).toFixed(2)}`}
          </Text>
        </View>
      </View>

      {/* ---------- FOOTER ---------- */}
      <View style={styles.footer}>
        <Text>Thank you for your purchase!</Text>
        <Text>This is a system-generated invoice. No signature required.</Text>
      </View>

      {/* ✅ Page number — global across whole PDF */}
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
        fixed
      />

      {/* ✅ Invoice counter shown only in bulk PDFs (bottom-left) */}
      {isBulk && (
        <Text style={styles.invoiceBadge}>
          {`Invoice ${invoiceIndex + 1} of ${totalInvoices}`}
        </Text>
      )}
    </Page>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function InvoiceTemplate({ data, isBulk = false }) {
  const invoices = isBulk ? data : [data];

  return (
    <Document>
      {invoices.map((invoice, index) => (
        <InvoicePage
          key={index}
          invoice={invoice}
          invoiceIndex={index}
          totalInvoices={invoices.length}
          isBulk={isBulk}
        />
      ))}
    </Document>
  );
}
