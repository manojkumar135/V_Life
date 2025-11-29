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
    alignItems: "flex-end"
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
  companyBlock: {
    flexDirection: "column",
    marginBottom: 10,
  },
  companyTitle: {
    fontSize: 12,
    fontWeight: "bold",
  },

  //------------------ TAX BOX ------------------
  taxBox: {
    width: "30%",
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
  },
  label: {
    fontWeight: "bold",
    paddingLeft: 2,
    paddingRight: 2

  },

  section: { marginBottom: 20, }, bold: { fontWeight: "bold", }, light: { color: "#555", fontSize: 10, marginBottom: 2, },

  //------------------ TABLE ------------------
  table: { display: 'table', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#2E2E2E', borderRightWidth: 0, borderBottomWidth: 0, marginBottom: 20, marginTop: 20, borderRadius: 1, },
  row: {
    flexDirection: "row",
  },
  col: { borderStyle: 'solid', borderWidth: 1, borderColor: '#2E2E2E', borderLeftWidth: 0, borderTopWidth: 0, padding: 5, },
  colHeader: {
    backgroundColor: "#facc15",// yellow
    color: "#000",
    fontWeight: "bold",
    textAlign: "center",
  },

  cell: {
    border: BORDER,
    padding: 3,
    textAlign: "center",
  },
  headCell: {
    fontWeight: "bold",
  },
  //------------------ COL WIDTHS ------------------
  cNo: { width: "3%" },
  cCode: { width: "8%" },
  cName: { width: "20%" },
  cHSN: { width: "10%" },
  cQty: { width: "5%" },
  cPrice: { width: "15%" },
  cDisc: { width: "9%" },
  cTaxable: { width: "10%" },
  cGST: { width: "5%" },
  cTotal: { width: "15%" },

  //------------------ TOTAL BOX ------------------
  totalsSection: {
    width: "55%",
    alignSelf: "flex-end",
    marginTop: 10,
    border: BORDER,
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

  deduction: { color: "red", fontSize: 10, },

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
      <Page size="A4" style={[styles.page, { marginLeft: "2rem", marginRight: "2rem" }]}>
        {/* ============ TOP HEADER =============== */}
        <View style={styles.headerBox}>
          {/* Left */}
          <View style={styles.headerLeft}>
            <Image
              src={"https://res.cloudinary.com/dtb4vozhy/image/upload/v1764400245/maverick-logo_sddrui.png"}
              style={styles.logo}
            />

          </View>

          {/* Right */}
          <View style={styles.taxBox}>
            <Text style={[styles.taxHeading, { marginBottom: "1rem", marginTop: "1rem" }]}>TAX INVOICE</Text>
            <View style={[styles.taxLine, { marginTop: "1rem" }]}>
              <Text>Invoice No :</Text>
              <Text>{data.order_id || "-"}</Text>
            </View>
            <View style={[styles.taxLine, { marginTop: "1rem" }]}>
              <Text>Invoice Date :</Text>
              <Text>{data.payment_date || "-"}</Text>
            </View>
          </View>
        </View>



        <View style={styles.separator} />
        <Text style={[styles.label, { marginLeft: 1, marginTop: 2, marginBottom: 3 }]}>FROM :</Text>

        <View style={[styles.companyBlock, { marginLeft: "4rem" }]}>
          <Text>#8/165-111/C, LAKE VIEW ROAD, BC RAMAIAH ST, FIRST LANE, RAJEEVNAGAR, ONGOLE, AP - 523002.</Text>
          <View style={[{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: "4rem", marginBottom: "4rem" }]}>
            <Text> • Email: support@maverickmoney.com</Text>
            <Text>+91 123456789 </Text>
            <Text>GSTIN : 37AAHCN1274B1ZP</Text>
          </View>

        </View>

        {/* ================= ADDRESS TABLE ================= */}
        <View style={styles.addressContainer}>
          {/* LEFT */}
          <View style={styles.colLeft}>
            <Text style={[styles.sectionTitle, { margin: "2rem" }]}>Shipping Address</Text>
            <View style={[{ display: "flex", flexDirection: "row", margin: "2rem" }]}>
              <Text style={styles.label}>USER NAME:</Text>
              <Text>{data.user_name || "-"}</Text>
            </View>

            <Text style={styles.label}>ADDRESS:</Text>
            <Text>{data.address || "-"}</Text>

            <View style={[{ display: "flex", flexDirection: "row", margin: "2rem" }]}>
              <Text style={styles.label}>Email:</Text>
              <Text>{data.mail || "-"}</Text>
            </View>

            <View style={[{ display: "flex", flexDirection: "row", margin: "2rem" }]}>
              <Text style={styles.label}>MOBILE NUMBER:</Text>
              <Text>{data.contact || "-"}</Text>
            </View>


          </View>

          {/* RIGHT */}
          <View style={styles.colRight}>
            <Text style={[styles.sectionTitle, { margin: "2rem" }]}>ORDER DETAIL</Text>
            <View style={[{ display: "flex", flexDirection: "row", margin: "2rem" }]}>
              <Text style={styles.label}>USER ID:</Text>
              <Text>{data.user_id || "-"}</Text>
            </View>

            <View style={[{ display: "flex", flexDirection: "row", margin: "2rem" }]}>
              <Text style={styles.label}>ORDER NO:</Text>
              <Text>{data.order_id || "-"}</Text>
            </View>
            <View style={[{ display: "flex", flexDirection: "row", margin: "2rem" }]}>
              <Text style={styles.label}>GST :</Text>
              <Text>{data.gst_no || "-"}</Text>
            </View>
            <View style={[{ display: "flex", flexDirection: "row", margin: "2rem" }]}>
              <Text style={styles.label}>Order Type: PV OR BV</Text>
              <Text>{data.order_type || "-"}</Text>
            </View>


          </View>
        </View>

        {/* ================= PRODUCT TABLE ================= */}
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.headCell, styles.cNo]}>S. No</Text>
            <Text style={[styles.cell, styles.headCell, styles.cCode]}>Product Code</Text>
            <Text style={[styles.cell, styles.headCell, styles.cName]}>Product Name</Text>
            <Text style={[styles.cell, styles.headCell, styles.cHSN]}>HSN/SAC Code</Text>
            <Text style={[styles.cell, styles.headCell, styles.cQty]}>QTY</Text>
            <Text style={[styles.cell, styles.headCell, styles.cPrice]}>PRICE</Text>
            {/* <Text style={[styles.cell, styles.headCell, styles.cDisc]}>Discount/Offer</Text> */}
            <Text style={[styles.cell, styles.headCell, styles.cTaxable]}>Taxable Amount</Text>
            <Text style={[styles.cell, styles.headCell, styles.cGST]}>CGST %</Text>
            <Text style={[styles.cell, styles.headCell, styles.cGST]}>SGST %</Text>
            <Text style={[styles.cell, styles.headCell, styles.cGST]}>IGST %</Text>
            <Text style={[styles.cell, styles.headCell, styles.cTotal]}>TOTAL</Text>
          </View>

          {data.items.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={[styles.cell, styles.cNo]}>{index + 1}</Text>
              <Text style={[styles.cell, styles.cCode]}>{item.product_code || item.product_id || ""}</Text>
              <Text style={[styles.cell, styles.cName, { textTransform: "capitalize" }]}>{item.name || ""}</Text>
              <Text style={[styles.cell, styles.cHSN]}>{item.hsn_code || ""}</Text>
              <Text style={[styles.cell, styles.cQty]}>{item.quantity || ""}</Text>
              <Text style={[styles.cell, styles.cPrice, { textAlign: "right" }]}> {`\u20B9 ${item.dealer_price.toFixed(2)}`}</Text>
              {/* <Text style={[styles.cell, styles.cDisc]}>{item.discount || "-"}</Text> */}
              <Text style={[styles.cell, styles.cTaxable, { textAlign: "right" }]}>{`\u20B9 ${item.whole_gst.toFixed(2)}`}</Text>
              <Text style={[styles.cell, styles.cGST, { textAlign: "right" }]}>{item.cgst || "0"}</Text>
              <Text style={[styles.cell, styles.cGST, { textAlign: "right" }]}>{item.sgst || "0"}</Text>
              <Text style={[styles.cell, styles.cGST, { textAlign: "right" }]}>{item.igst || "0"}</Text>
              <Text style={[styles.cell, styles.cTotal, { textAlign: "right" }]}>{`\u20B9 ${(item.gst * item.dealer_price).toFixed(2)}`}</Text>
            </View>
          ))}
        </View>

        {/* ================= TOTALS BOX ================= */}
        <View style={styles.totalsSection}>
          <View style={[styles.totalsRow, styles.totalsBottomBorder, { textAlign: "right" }]}>
            <Text>Total Amount Before Tax</Text>
            <Text>{`\u20B9 ${(data.total_amount - data.total_gst).toFixed(2)}`}</Text>
          </View>
          <View style={[styles.totalsRow, styles.totalsBottomBorder, { textAlign: "right" }]}>
            <Text>Add GST</Text>
            <Text>{data.total_gst}</Text>
          </View>
          <View style={[styles.totalsRow, styles.totalsBottomBorder, { textAlign: "right" }]}>
            <Text>Grand Total</Text>
            <Text>{data.total_amount}</Text>
          </View>

          {/* <View>
            <Text style={styles.label}>Total Amount in Words:</Text>
            <Text>{data.total_words}</Text>
          </View> */}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your purchase!</Text>
          <Text>This is a system-generated invoice. No signature required.</Text>
        </View>
      </Page>
    </Document>
  );
}
