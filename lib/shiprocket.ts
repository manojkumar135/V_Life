// lib/shiprocket.ts
// ShipRocket API service — auth, create order, track
// Base URL: https://apiv2.shiprocket.in/v1/external

import axios from "axios";

const SR_BASE = "https://apiv2.shiprocket.in/v1/external";

// ── Token cache (valid 24h, re-fetch after 23h) ───────────────────────────────
let cachedToken: string | null = null;
let tokenExpiry  = 0;

export async function getShipRocketToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await axios.post(`${SR_BASE}/auth/login`, {
    email:    process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });

  if (!res.data.token) throw new Error("ShipRocket auth failed");
  cachedToken = res.data.token as string;
  tokenExpiry  = Date.now() + 23 * 60 * 60 * 1000; // 23h
  return cachedToken;
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ── Create order (adhoc / custom channel) ────────────────────────────────────
// POST /orders/create/adhoc
// Returns: { order_id (SR), shipment_id, status, awb_code?, courier_name? }
export async function srCreateOrder(payload: SROrderPayload) {
  const token = await getShipRocketToken();
  const res   = await axios.post(
    `${SR_BASE}/orders/create/adhoc`,
    payload,
    { headers: headers(token) }
  );
  return res.data;
}

// ── Track by shipment_id ──────────────────────────────────────────────────────
// GET /courier/track/shipment/:shipment_id
export async function srTrackByShipmentId(shipment_id: string | number) {
  const token = await getShipRocketToken();
  const res   = await axios.get(
    `${SR_BASE}/courier/track/shipment/${shipment_id}`,
    { headers: headers(token) }
  );
  return res.data; // { tracking_data: { ... } }
}

// ── Track by AWB ──────────────────────────────────────────────────────────────
// GET /courier/track/awb/:awb
export async function srTrackByAWB(awb: string) {
  const token = await getShipRocketToken();
  const res   = await axios.get(
    `${SR_BASE}/courier/track/awb/${awb}`,
    { headers: headers(token) }
  );
  return res.data;
}

// ── Get pickup locations ──────────────────────────────────────────────────────
// GET /settings/company/pickup
export async function srGetPickupLocations() {
  const token = await getShipRocketToken();
  const res   = await axios.get(
    `${SR_BASE}/settings/company/pickup`,
    { headers: headers(token) }
  );
  return res.data?.data?.shipping_address || [];
}

// ── Cancel orders ─────────────────────────────────────────────────────────────
// POST /orders/cancel  { ids: [sr_order_id, ...] }
export async function srCancelOrder(sr_order_ids: number[]) {
  const token = await getShipRocketToken();
  const res   = await axios.post(
    `${SR_BASE}/orders/cancel`,
    { ids: sr_order_ids },
    { headers: headers(token) }
  );
  return res.data;
}

// ── Helper: map your Order document → ShipRocket payload ─────────────────────
// office = your office-operations document (pickup address)
export function buildSRPayload(order: any, office: any): SROrderPayload {
  const items: SROrderItem[] = (order.items || []).map((item: any) => ({
    name:          item.name,
    sku:           item.product_code || item.product_id,
    units:         item.quantity,
    selling_price: item.price_with_gst || item.unit_price,
    discount:      0,
    tax:           String(item.gst || 0),
    hsn:           item.hsn_code ? Number(item.hsn_code) : undefined,
  }));

  // Parse order date to "YYYY-MM-DD HH:mm" format
  const orderDate = order.payment_date
    ? formatSRDate(order.payment_date)
    : formatSRDate(new Date().toLocaleDateString());

  return {
    order_id:              order.order_id,
    order_date:            orderDate,
    pickup_location:       process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",

    billing_customer_name: order.user_name || "",
    billing_last_name:     "",
    billing_address:       order.address || "",
    billing_address_2:     order.landmark || "",
    billing_city:          order.city     || "",
    billing_pincode:       String(order.pincode || ""),
    billing_state:         order.state    || "",
    billing_country:       order.country  || "India",
    billing_email:         order.mail     || "",
    billing_phone:         String(order.contact || ""),

    shipping_is_billing:   true,

    order_items:           items,
    payment_method:        "Prepaid",
    sub_total:             order.total_amount || order.amount || 0,

    // Default dimensions — override from env or product data
    length:  Number(process.env.SHIPROCKET_DEFAULT_LENGTH  || 10),
    breadth: Number(process.env.SHIPROCKET_DEFAULT_BREADTH || 10),
    height:  Number(process.env.SHIPROCKET_DEFAULT_HEIGHT  || 10),
    weight:  Number(process.env.SHIPROCKET_DEFAULT_WEIGHT  || 0.5),
  };
}

// ── Format date string → "YYYY-MM-DD HH:mm" ──────────────────────────────────
function formatSRDate(dateStr: string): string {
  try {
    // Handles "DD/MM/YYYY", "D/M/YYYY", "MM-DD-YYYY" etc.
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      // Detect DD/MM/YYYY vs MM/DD/YYYY vs YYYY-MM-DD
      if (parts[2].length === 4) {
        // DD/MM/YYYY
        return `${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")} 00:00`;
      }
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return `${parts[0]}-${parts[1].padStart(2,"0")}-${parts[2].padStart(2,"0")} 00:00`;
      }
    }
    return new Date().toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return new Date().toISOString().slice(0, 16).replace("T", " ");
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SROrderPayload {
  order_id:              string;
  order_date:            string;           // "YYYY-MM-DD HH:mm"
  pickup_location:       string;           // pickup location name in SR account
  channel_id?:           number;
  comment?:              string;
  billing_customer_name: string;
  billing_last_name?:    string;
  billing_address:       string;
  billing_address_2?:    string;
  billing_city:          string;
  billing_pincode:       string;
  billing_state:         string;
  billing_country:       string;
  billing_email:         string;
  billing_phone:         string;
  shipping_is_billing:   boolean;
  shipping_customer_name?: string;
  shipping_address?:     string;
  shipping_city?:        string;
  shipping_pincode?:     string;
  shipping_state?:       string;
  shipping_country?:     string;
  shipping_email?:       string;
  shipping_phone?:       string;
  order_items:           SROrderItem[];
  payment_method:        "Prepaid" | "COD";
  sub_total:             number;
  length:                number;           // cm
  breadth:               number;           // cm
  height:                number;           // cm
  weight:                number;           // kg
}

export interface SROrderItem {
  name:          string;
  sku:           string;
  units:         number;
  selling_price: number;
  discount?:     number;
  tax?:          string;
  hsn?:          number;
}