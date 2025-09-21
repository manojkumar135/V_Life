"use client";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
    color: "#111",
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "2 solid #facc15", // yellow-500
    paddingBottom: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#facc15", // yellow-500
  },
  logo: {
    width: 60,
    height: 60,
  },
  section: {
    marginBottom: 20,
  },
  bold: {
    fontWeight: "bold",
  },
  light: {
    color: "#555",
    fontSize: 10,
    marginBottom: 2,
  },
  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderColor: "#d1d5db", // gray-300
    borderWidth: 1,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
  },
  col: {
    borderStyle: "solid",
    borderColor: "#d1d5db",
    borderWidth: 1,
    padding: 6,
    fontSize: 10,
  },
  colHeader: {
    backgroundColor: "#facc15", // yellow
    color: "#000",
    fontWeight: "bold",
    textAlign: "center",
  },
  col1: { width: "10%" },
  col2: { width: "40%" },
  col3: { width: "15%" },
  col4: { width: "15%" },
  col5: { width: "20%" },
  totalBlock: {
    alignItems: "flex-end",
    marginTop: 10,
    borderTop: "1 solid #ccc",
    paddingTop: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "40%",
    fontSize: 10,
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

export default function InvoiceTemplate({ order }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.light}>Order ID: {order.order_id}</Text>
            <Text style={styles.light}>Date: {order.payment_date}</Text>
          </View>
          {order.items[0]?.image && (
            <Image style={styles.logo} src={order.items[0].image} />
          )}
        </View>

        {/* Bill To */}
        <View style={styles.section}>
          <Text style={styles.bold}>BILL TO:</Text>
          <Text style={styles.light}>{order.user_name}</Text>
          <Text style={styles.light}>{order.mail}</Text>
          <Text style={styles.light}>{order.contact}</Text>
          <Text style={styles.light}>{order.address}</Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Header row */}
          <View style={styles.row}>
            {["#", "Item", "Qty", "Unit Price", "Total"].map((h, i) => (
              <Text
                key={i}
                style={[
                  styles.col,
                  styles.colHeader,
                  i === 0 && styles.col1,
                  i === 1 && styles.col2,
                  i === 2 && styles.col3,
                  i === 3 && styles.col4,
                  i === 4 && styles.col5,
                ]}
              >
                {h}
              </Text>
            ))}
          </View>
          {/* Items */}
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={[styles.col, styles.col1]}>{idx + 1}</Text>
              <Text style={[styles.col, styles.col2]}>{item.name}</Text>
              <Text style={[styles.col, styles.col3]}>{item.quantity}</Text>
              <Text style={[styles.col, styles.col4]}>
                ₹ {item.unit_price.toFixed(2)}
              </Text>
              <Text style={[styles.col, styles.col5]}>
                ₹ {item.price.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalBlock}>
          <View style={styles.totalRow}>
            <Text>Subtotal:</Text>
            <Text>₹ {order.amount.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Total Amount:</Text>
            <Text style={{ fontWeight: "bold" }}>
              ₹ {order.final_amount.toFixed(2)}
            </Text>
          </View>
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
