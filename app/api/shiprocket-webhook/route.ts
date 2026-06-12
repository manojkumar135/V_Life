// app/api/shiprocket-webhook/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/order";

// ── ShipRocket tests endpoint with GET first ──────────────────────────────────
export async function GET() {
  return new Response("OK", { status: 200 });
}

export async function POST(req: Request) {
  try {
    // ── Validate webhook secret ───────────────────────────────────────────
    const secret = req.headers.get("x-api-key");
    if (
      process.env.SHIPROCKET_WEBHOOK_SECRET &&
      secret !== process.env.SHIPROCKET_WEBHOOK_SECRET
    ) {
      // Still return 200 so SR doesn't mark endpoint as down
      return new Response("OK", { status: 200 });
    }

    // ── Safe body parse — ShipRocket test may send empty body ────────────
    let body: any = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      // Empty or non-JSON body from SR test ping — just return 200
      return new Response("OK", { status: 200 });
    }

    const {
      awb,
      courier_name,
      current_status,
      shipment_status,
      order_id: srOrderRef,
      etd,
      awb_assigned_date,
      scans,
    } = body;

    // Extract YOUR order_id — SR sends as "OR12345_348456385"
    const yourOrderId = srOrderRef?.split("_")?.[0] || "";

    if (!yourOrderId) {
      return new Response("OK", { status: 200 });
    }

    await connectDB();

    const ourStatus = mapSRStatus(current_status || shipment_status || "");
    const lastScan  = scans?.[scans.length - 1];

    const setPayload: Record<string, any> = {
      "shipping.courier_name":       courier_name || "",
      "shipping.tracking_id":        awb          || "",
      "shipping.tracking_url":       awb ? `https://shiprocket.co/tracking/${awb}` : "",
      "shipping.estimated_delivery": etd          || "",
      "shipping.dispatch_date":      awb_assigned_date?.split(" ")?.[0] || "",
      "shipping.updated_at":         new Date(),
    };

    if (ourStatus === "delivered") {
      setPayload["shipping.delivered_date"] = lastScan?.date?.split(" ")?.[0] || "";
      setPayload["shipping.delivered_time"] = lastScan?.date?.split(" ")?.[1] || "";
    }

    if (ourStatus) {
      setPayload["order_status"] = ourStatus;
    }

    await Order.findOneAndUpdate(
      { order_id: yourOrderId },
      { $set: setPayload }
    );

    console.log(`SR Webhook: ${yourOrderId} → ${ourStatus || current_status}`);

    // Always return plain 200 — not JSON — ShipRocket expects status code 200
    return new Response("OK", { status: 200 });

  } catch (error: any) {
    console.error("SR Webhook error:", error.message);
    // Always 200 — never let SR think endpoint is down
    return new Response("OK", { status: 200 });
  }
}

function mapSRStatus(srStatus: string): string {
  const s = srStatus?.toUpperCase() || "";
  if (s.includes("DELIVERED"))        return "delivered";
  if (s.includes("OUT FOR DELIVERY")) return "out_for_delivery";
  if (s.includes("IN TRANSIT"))       return "dispatched";
  if (s.includes("PICKED UP"))        return "dispatched";
  if (s.includes("SHIPPED"))          return "dispatched";
  if (s.includes("MANIFEST"))         return "packed";
  if (s.includes("RETURN"))           return "returned";
  if (s.includes("CANCEL"))           return "cancelled";
  return "";
}