"use client";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Roboto",
  fonts: [
    { src: "/fonts/Roboto/Roboto-Regular.ttf" },
    { src: "/fonts/Roboto/Roboto-Bold.ttf", fontWeight: "bold" },
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

  //------------------ HEADER ------------------
  headerBox: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  headerLeft: {
    flexDirection: "column",
    width: "50%",
  },
  logo: {
    width: 120,
    height: 50,
    marginRight: 8,
    marginLeft: 10,
  },

  //------------------ TAX BOX ------------------
  taxBox: {
    width: "28%",
    border: BORDER,
    padding: 4,
    paddingRight: 5,
    paddingLeft: 5,
    height: 48,
  },
  taxHeading: {
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 3,
  },
  taxLine: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  separator: {
    borderBottom: BORDER,
    marginVertical: 6,
  },

  //------------------ ADDRESS BLOCK ------------------
  addressContainer: {
    flexDirection: "row",
    border: BORDER,
    // height:100,
  },
  colLeft: {
    width: "70%",
    borderRight: BORDER,
    padding: 4,
  },
  colRight: {
    width: "30%",
    padding: 4,
  },
  sectionTitle: {
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 3,
    fontSize: 10,
  },
  label: {
    fontWeight: "bold",
    marginLeft: 2,
    marginRight: 2,
  },

  //------------------ NEW TABLE STYLES ------------------
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
  row: {
    flexDirection: "row",
  },
  col: {
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#2E2E2E",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
    fontSize: 8.5,
  },
  headerCol: {
    // backgroundColor: "#facc15",
    fontWeight: "bold",
    textAlign: "center",
  },

  //------------------ WIDTH MAP ------------------
  cNo: { width: "4%" },
  cCode: { width: "10%" },
  cName: { width: "20%" },
  cHSN: { width: "10%" },
  cQty: { width: "5%" },
  cPrice: { width: "12%" },
  cTaxable: { width: "10%" },
  cGST: { width: "6%" },
  cTotal: { width: "15%" },

  //------------------ TOTAL BLOCK ------------------
  totalsSection: {
    width: "55%",
    alignSelf: "flex-end",
    marginTop: 10,
    // border: BORDER,
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

  //------------------ FOOTER ------------------
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
});

export default function InvoiceTemplate({ data }) {
  return (
    <Document>
      <Page size="A4" style={[styles.page, { marginLeft: 1, marginRight: 1 }]}>

        {/* ---------- HEADER ---------- */}
        <View style={styles.headerBox}>
          <View style={styles.headerLeft}>
            <Image
              src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1764400245/maverick-logo_sddrui.png"
              style={styles.logo}
            />
          </View>

          <View style={styles.taxBox}>
            <Text style={styles.taxHeading}>TAX INVOICE</Text>
            <View style={[styles.taxLine, { marginTop: 2 }]}>
              <Text>Invoice No :</Text>
              <Text>{data.order.order_id || "N/A"}</Text>
            </View>
            <View style={[styles.taxLine, { marginTop: 2 }]}>
              <Text>Invoice Date :</Text>
              <Text>{data.order.payment_date || "N/A"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.separator} />

        <Text style={[styles.label, { marginTop: 2 }]}>FROM :</Text>

        <View style={{ marginLeft: 3 }}>
          {/* Address */}
          <Text>
            {data.office?.office_street}
            {data.office?.office_landmark ? `, ${data.office.office_locality}` : ""}
            {data.office?.office_city ? `, ${data.office.office_state}` : ""}
            {data.office?.office_country ? ` - ${data.office.office_pincode}` : ""}
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 5,
              marginBottom: 5,
            }}
          >
            {/* Email */}
            <Text>
              • Email: {data.office?.office_email || "—"}
            </Text>

            {/* Phone */}
            <Text>
              {data.office?.office_contact || office?.phone || "—"}
            </Text>

            {/* GST */}
            <Text>
              GSTIN : {data.office?.office_gst_number || "—"}
            </Text>
          </View>
        </View>


        {/* ================= ADDRESS TABLE ================= */}
        <View style={styles.addressContainer}>
          {/* LEFT */}
          <View style={styles.colLeft}>
            <Text style={[styles.sectionTitle, { margin: 5, }]}>SHIPPING ADDRESS</Text>
            <View style={[{ display: "flex", flexDirection: "row", margin: 5 }]}>
              <Text style={styles.label}>USER NAME  :</Text>
              <Text>{data.order.user_name || "N/A"}</Text>
            </View>
            <View style={[{ display: "flex", marginLeft: 5 }]}>
              <Text style={styles.label}>ADDRESS  :</Text>
              <Text style={{ margin: 5, marginLeft: 10, textTransform: "capitalize", fontSize: 9, marginBottom: 30 }}>{data.order.address || "N/A"}</Text>
            </View>

            <View style={[{ display: "flex", flexDirection: "row", marginTop: 5, marginLeft: 5 }]}>
              <Text style={styles.label}>Email  :</Text>
              <Text>{data.order.mail || "N/A"}</Text> </View>
            <View style={[{ display: "flex", flexDirection: "row", marginTop: 5, marginLeft: 5 }]}>
              <Text style={styles.label}>Contact  :</Text>
              <Text>{data.order.contact || "N/A"}</Text> </View>
          </View>
          {/* RIGHT */}
          <View style={styles.colRight}>
            <Text style={[styles.sectionTitle, { margin: 5 }]}>ORDER DETAILS</Text>
            <View style={[{ display: "flex", flexDirection: "row", margin: 5 }]}>
              <Text style={styles.label}>USER ID  :</Text> <Text>{data.order.user_id || "N/A"}</Text>
            </View> <View style={[{ display: "flex", flexDirection: "row", margin: 5 }]}>
              <Text style={styles.label}>ORDER NO  :</Text> <Text>{data.order.order_id || "N/A"}</Text>
            </View> <View style={[{ display: "flex", flexDirection: "row", margin: 5 }]}>
              <Text style={styles.label}>GST :</Text> <Text>{data.order.gst_no || "N/A"}</Text>
            </View>
            <View style={[{ display: "flex", flexDirection: "row", margin: 5 }]}>
              <Text style={styles.label}>Order Type  : PV OR BV</Text>
              {/* <Text>{data.order.order_type || "N/A"}</Text> */}
            </View>
          </View>
        </View>

        {/* ---------- PRODUCT TABLE ---------- */}
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.col, styles.headerCol, styles.cNo]}>S. No</Text>
            <Text style={[styles.col, styles.headerCol, styles.cCode]}>Product Code</Text>
            <Text style={[styles.col, styles.headerCol, styles.cName]}>Product Name</Text>
            <Text style={[styles.col, styles.headerCol, styles.cHSN]}>HSN/SAC code</Text>
            <Text style={[styles.col, styles.headerCol, styles.cQty]}>Qty</Text>
            <Text style={[styles.col, styles.headerCol, styles.cPrice]}>Unit Price (₹)</Text>
            <Text style={[styles.col, styles.headerCol, styles.cTaxable]}>Taxable Amount </Text>
            <Text style={[styles.col, styles.headerCol, styles.cGST]}>CGST (%)</Text>
            <Text style={[styles.col, styles.headerCol, styles.cGST]}>SGST (%)</Text>
            <Text style={[styles.col, styles.headerCol, styles.cGST]}>IGST (%)</Text>
            <Text style={[styles.col, styles.headerCol, styles.cTotal]}>Total (₹)</Text>
          </View>

          {data.order.items.map((item, index) => {
            const total = (item.gst * item.dealer_price).toFixed(2);

            return (
              <View key={index} style={styles.row}>
                <Text style={[styles.col, styles.cNo, { textAlign: "right" }]}>{index + 1}</Text>
                <Text style={[styles.col, styles.cCode, { textAlign: "center" }]}>{item.product_code || ""}</Text>
                <Text style={[styles.col, styles.cName, { textTransform: "capitalize" }]}>{item.name}</Text>
                <Text style={[styles.col, styles.cHSN, { textAlign: "center" }]}>{item.hsn_code || ""}</Text>
                <Text style={[styles.col, styles.cQty, { textAlign: "center" }]}>{item.quantity}</Text>
                <Text style={[styles.col, styles.cPrice, { textAlign: "right" }]}>{`\u20B9 ${item.dealer_price.toFixed(2)}`}</Text>
                <Text style={[styles.col, styles.cTaxable, { textAlign: "right" }]}>{`\u20B9 ${item.whole_gst.toFixed(2)}`}</Text>
                <Text style={[styles.col, styles.cGST, { textAlign: "right" }]}>{item.igst.toFixed(1) || "0"}</Text>
                <Text style={[styles.col, styles.cGST, { textAlign: "right" }]}>{item.cgst.toFixed(1) || "0"}</Text>
                <Text style={[styles.col, styles.cGST, { textAlign: "right" }]}>{item.sgst.toFixed(1) || "0"}</Text>
                <Text style={[styles.col, styles.cTotal, { textAlign: "right" }]}>{`\u20B9 ${((item.dealer_price + item.gst_amount) * item.quantity).toFixed(2)}`}</Text>
              </View>
            );
          })}
        </View>

        {/* ---------- TOTAL SECTION ---------- */}
        <View style={styles.totalsSection}>
          <View style={[styles.totalsRow]}>
            <Text>Total Before Tax</Text>
            <Text>{`\u20B9 ${(data.order.total_amount - data.order.total_gst).toFixed(2)}`}</Text>
          </View>



          <View style={[styles.totalsRow,]}>
            <Text>Add GST</Text>
            <Text>{`\u20B9 ${data.order.total_gst.toFixed(2)}`}</Text>
          </View>

          {/* ---- ADVANCE DEDUCTED ---- */}
          {data.order.reward_used > 0 && (
            <>


              {/* Cashback */}
              {data.order.reward_usage?.cashback?.used > 0 && (
                <View style={styles.totalsRow}>
                  <Text >Cashback</Text>
                  <Text style={styles.deduction}>
                    {`- ₹ ${data.order.reward_usage.cashback.used.toFixed(2)}`}
                  </Text>
                </View>
              )}

              {/* Fortnight */}
              {data.order.reward_usage?.fortnight?.used > 0 && (
                <View style={styles.totalsRow}>
                  <Text >Fortnight</Text>
                  <Text style={styles.deduction}>
                    {`- ₹ ${data.order.reward_usage.fortnight.used.toFixed(2)}`}
                  </Text>
                </View>
              )}


            </>
          )}




          <View style={[styles.totalsBottomBorder]}>

          </View>

          <View style={[styles.totalsRow]}>
            <Text style={{ fontWeight: "bold", fontSize: 10 }}>Grand Total</Text>
            <Text style={{ fontWeight: "bold", fontSize: 10 }}>{`\u20B9 ${data.order.final_amount.toFixed(2)}`}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Thank you for your purchase!</Text>
          <Text>This is a system-generated invoice. No signature required.</Text>
        </View>

      </Page>
    </Document>
  );
}
