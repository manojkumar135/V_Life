// "use client";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";

// ADD these imports at the top
import path from "path";
import fs from "fs";

// REPLACE the Font.register block with this
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
  taxBox: {
    width: "32%",
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
    marginTop: 2,
  },
  separator: {
    borderBottom: BORDER,
    marginVertical: 6,
  },
  label: {
    fontWeight: "bold",
    marginLeft: 2,
    marginRight: 2,
  },
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
    fontSize: 10,
  },
  table: {
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
  headerCol: {
    fontWeight: "bold",
    textAlign: "center",
  },
  cNo:    { width: "5%" },
  cName:  { width: "28%" },
  cType:  { width: "12%" },
  cQty:   { width: "7%" },
  cReq:   { width: "14%" },
  cUsed:  { width: "14%" },
  cGst:   { width: "10%" },
  cTotal: { width: "10%" },
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
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
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

function statusColor(status: string) {
  const map: Record<string, string> = {
    pending:    "#b45309",
    booked:     "#1d4ed8",
    dispatched: "#6d28d9",
    delivered:  "#15803d",
    cancelled:  "#b91c1c",
  };
  return map[status?.toLowerCase()] || "#555";
}

const DEFAULT_GST_RATE  = 0;
const DEFAULT_CGST_RATE = 0;
const DEFAULT_SGST_RATE = 0;
const DEFAULT_IGST_RATE = 0;

type BookingInvoiceTemplateProps = {
  data: any;
  isBulk?: boolean;
};

// ── Single page renderer ──────────────────────────────────────────────────────
function BookingPage({ booking, office }: { booking: any; office: any }) {
  const isMatching = booking.type === "matching";
  const unitLabel  = isMatching ? "Matches" : "pts";
  const reqLabel   = isMatching ? "Matches Required" : "Points Required";
  const usedLabel  = isMatching ? "Matches Used"     : "Points Used";

  const gstRate  = booking.gst_rate  ?? DEFAULT_GST_RATE;
  const cgstRate = booking.cgst_rate ?? DEFAULT_CGST_RATE;
  const sgstRate = booking.sgst_rate ?? DEFAULT_SGST_RATE;
  const igstRate = booking.igst_rate ?? DEFAULT_IGST_RATE;

  const totalUsed = isMatching
    ? (booking.total_matches_used ?? 0)
    : (booking.total_score_used   ?? 0);

  const remainingUnits = isMatching
    ? (booking.remaining_matches ?? 0)
    : (booking.remaining_score   ?? 0);

  const rewardCount = (booking.rewards || []).reduce(
    (sum: number, r: any) => sum + (r.count || 0),
    0,
  );

  const baseAmount = booking.base_amount ?? 0;
  const gstAmount  = booking.gst_amount  ?? (baseAmount * gstRate) / 100;
  const grandTotal = booking.grand_total ?? baseAmount + gstAmount;

  return (
    <Page size="A4" style={[styles.page, { marginLeft: 1, marginRight: 1 }]}>
      {/* ── HEADER ── */}
      <View style={styles.headerBox}>
        <View style={styles.headerLeft}>
          <Image
            src="https://res.cloudinary.com/df2vugog5/image/upload/v1773936754/maverick-logo_ao66bd.png"
            style={styles.logo}
          />
        </View>

        <View style={styles.taxBox}>
          <Text style={styles.taxHeading}>BOOKING INVOICE</Text>
          <View style={styles.taxLine}>
            <Text>Booking No :</Text>
            <Text>{booking.booking_id || "N/A"}</Text>
          </View>
          <View style={styles.taxLine}>
            <Text>Date :</Text>
            <Text>{booking.date || "N/A"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.separator} />

      {/* ── FROM ── */}
      <Text style={[styles.label, { marginTop: 2 }]}>
        FROM :
        <Text style={{ fontWeight: "normal" }}>
          {" "}Maverick Signature Network PVT Ltd
        </Text>
      </Text>

      <View style={{ marginLeft: 3 }}>
        <Text>
          {office?.office_street || ""}
          {office?.office_locality ? `, ${office.office_locality}` : ""}
          {office?.office_state   ? `, ${office.office_state}`     : ""}
          {office?.office_pincode ? ` - ${office.office_pincode}`  : ""}
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
            <Text style={{ fontWeight: "bold" }}>Email :</Text>{" "}
            {office?.office_email || "—"}
          </Text>
          <Text>
            <Text style={{ fontWeight: "bold" }}>Contact :</Text>{" "}
            {office?.office_contact || "—"}
          </Text>
          <Text>
            <Text style={{ fontWeight: "bold" }}>GSTIN :</Text>{" "}
            {office?.office_gst_number || "—"}
          </Text>
        </View>
      </View>

      {/* ── ADDRESS TABLE ── */}
      <View style={styles.addressContainer}>
        {/* LEFT — shipping address */}
        <View style={styles.colLeft}>
          <Text style={[styles.sectionTitle, { margin: 5 }]}>
            SHIPPING ADDRESS
          </Text>

          <View style={{ flexDirection: "row", margin: 5 }}>
            <Text style={styles.label}>USER NAME :</Text>
            <Text>{booking.user_name || "N/A"}</Text>
          </View>

          <View style={{ marginLeft: 5 }}>
            <Text style={styles.label}>ADDRESS :</Text>
            <Text
              style={{
                margin: 5,
                marginLeft: 10,
                textTransform: "capitalize",
                fontSize: 9,
                marginBottom: 4,
              }}
            >
              {booking.door_no  ? `${booking.door_no}, `  : ""}
              {booking.landmark ? `${booking.landmark}, ` : ""}
              {booking.city     ? `${booking.city}, `     : ""}
              {booking.state    ? `${booking.state}, `    : ""}
              {booking.country  ? `${booking.country}`    : ""}
              {booking.pincode  ? ` - ${booking.pincode}` : ""}
              {!booking.door_no && !booking.city && (booking.address || "N/A")}
            </Text>
          </View>

          <View style={{ flexDirection: "row", marginTop: 5, marginLeft: 5 }}>
            <Text style={styles.label}>Email :</Text>
            <Text>{booking.user_email || "N/A"}</Text>
          </View>
          <View style={{ flexDirection: "row", marginTop: 5, marginLeft: 5 }}>
            <Text style={styles.label}>Contact :</Text>
            <Text>{booking.user_contact || "N/A"}</Text>
          </View>

          {booking.shipping?.tracking_id && (
            <View style={{ flexDirection: "row", marginTop: 5, marginLeft: 5 }}>
              <Text style={styles.label}>Tracking ID :</Text>
              <Text>{booking.shipping.tracking_id}</Text>
            </View>
          )}
          {booking.shipping?.courier_partner && (
            <View style={{ flexDirection: "row", marginTop: 3, marginLeft: 5 }}>
              <Text style={styles.label}>Courier :</Text>
              <Text>{booking.shipping.courier_partner}</Text>
            </View>
          )}
        </View>

        {/* RIGHT — booking details */}
        <View style={styles.colRight}>
          <Text style={[styles.sectionTitle, { margin: 5 }]}>
            BOOKING DETAILS
          </Text>

          <View style={{ flexDirection: "row", margin: 5 }}>
            <Text style={styles.label}>USER ID :</Text>
            <Text>{booking.user_id || "N/A"}</Text>
          </View>
          <View style={{ flexDirection: "row", margin: 5 }}>
            <Text style={styles.label}>BOOKING NO :</Text>
            <Text>{booking.booking_id || "N/A"}</Text>
          </View>
          <View style={{ flexDirection: "row", margin: 5 }}>
            <Text style={styles.label}>TYPE :</Text>
            <Text style={{ textTransform: "capitalize" }}>
              {booking.type || "N/A"}
            </Text>
          </View>

          {gstRate > 0 && (
            <View style={{ flexDirection: "row", margin: 5 }}>
              <Text style={styles.label}>GST % :</Text>
              <Text>{gstRate}%</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── REWARDS TABLE ── */}
      <View style={styles.table}>
        {/* Header row */}
        <View style={styles.row}>
          <Text style={[styles.col, styles.headerCol, styles.cNo]}>S.No</Text>
          <Text style={[styles.col, styles.headerCol, styles.cName]}>
            Reward Name
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cType]}>
            Type
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cQty]}>Qty</Text>
          <Text style={[styles.col, styles.headerCol, styles.cReq]}>
            {reqLabel}
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cUsed]}>
            {usedLabel}
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cGst]}>
            {cgstRate > 0 ? `CGST (${cgstRate}%)` : "CGST"}
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cGst]}>
            {sgstRate > 0 ? `SGST (${sgstRate}%)` : "SGST"}
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cGst]}>
            {igstRate > 0 ? `IGST (${igstRate}%)` : "IGST"}
          </Text>
          <Text style={[styles.col, styles.headerCol, styles.cTotal]}>
            Total
          </Text>
        </View>

        {/* Data rows */}
        {(booking.rewards || []).map((item: any, index: number) => {
          const req = isMatching
            ? (item.matches_required ?? 0)
            : (item.points_required  ?? 0);
          const used = isMatching
            ? (item.matches_used ?? 0)
            : (item.score_used   ?? 0);

          const itemCgst =
            item.cgst ??
            (cgstRate > 0 ? ((item.base_value || 0) * cgstRate) / 100 : 0);
          const itemSgst =
            item.sgst ??
            (sgstRate > 0 ? ((item.base_value || 0) * sgstRate) / 100 : 0);
          const itemIgst =
            item.igst ??
            (igstRate > 0 ? ((item.base_value || 0) * igstRate) / 100 : 0);
          const itemTotal =
            item.total_value ??
            (item.base_value ?? 0) + itemCgst + itemSgst + itemIgst;

          return (
            <View key={index} style={styles.row}>
              <Text style={[styles.col, styles.cNo, { textAlign: "right" }]}>
                {index + 1}
              </Text>
              <Text style={[styles.col, styles.cName, { textTransform: "capitalize" }]}>
                {item.reward_name}
              </Text>
              <Text style={[styles.col, styles.cType, { textAlign: "center", textTransform: "capitalize" }]}>
                {item.type}
              </Text>
              <Text style={[styles.col, styles.cQty, { textAlign: "center" }]}>
                {item.count}
              </Text>
              <Text style={[styles.col, styles.cReq, { textAlign: "right" }]}>
                {req} {unitLabel}
              </Text>
              <Text style={[styles.col, styles.cUsed, { textAlign: "right" }]}>
                {used} {unitLabel}
              </Text>
              <Text style={[styles.col, styles.cGst, { textAlign: "right" }]}>
                {cgstRate > 0 ? itemCgst.toFixed(2) : "—"}
              </Text>
              <Text style={[styles.col, styles.cGst, { textAlign: "right" }]}>
                {sgstRate > 0 ? itemSgst.toFixed(2) : "—"}
              </Text>
              <Text style={[styles.col, styles.cGst, { textAlign: "right" }]}>
                {igstRate > 0 ? itemIgst.toFixed(2) : "—"}
              </Text>
              <Text style={[styles.col, styles.cTotal, { textAlign: "right" }]}>
                {itemTotal > 0
                  ? `\u20B9 ${itemTotal.toFixed(2)}`
                  : `${used} ${unitLabel}`}
              </Text>
            </View>
          );
        })}
      </View>

      {/* ── TOTALS ── */}
      <View style={styles.totalsSection}>
        <View style={styles.totalsBottomBorder} />
        <View style={styles.totalsRow}>
          <Text style={{ fontWeight: "bold", fontSize: 10 }}>
            {grandTotal > 0
              ? "Grand Total"
              : "Total " + (isMatching ? "Matches" : "Points") + " Redeemed"}
          </Text>
          <Text style={{ fontWeight: "bold", fontSize: 10 }}>
            {grandTotal > 0
              ? `\u20B9 ${grandTotal.toFixed(2)}`
              : `${totalUsed} ${unitLabel}`}
          </Text>
        </View>
      </View>

      {/* ── NOTES ── */}
      {booking.description && (
        <View style={{ marginTop: 10, marginLeft: 6 }}>
          <Text style={styles.label}>Notes :</Text>
          <Text style={{ marginTop: 3, fontSize: 9, color: "#444" }}>
            {booking.description}
          </Text>
        </View>
      )}

      {/* ── FOOTER ── */}
      <View style={styles.footer}>
        <Text>Thank you for your redemption!</Text>
        <Text>
          This is a system-generated booking invoice. No signature required.
        </Text>
      </View>
    </Page>
  );
}

// ── Main export — handles both single {booking,office} and bulk array ─────────
export default function BookingInvoiceTemplate({
  data,
  isBulk = false,
}: BookingInvoiceTemplateProps) {
  const items: Array<{ booking: any; office: any }> = isBulk
    ? (data as Array<{ booking: any; office: any }>)
    : [data as { booking: any; office: any }];

  return (
    <Document>
      {items.map((item, idx) => (
        <BookingPage key={idx} booking={item.booking} office={item.office} />
      ))}
    </Document>
  );
}