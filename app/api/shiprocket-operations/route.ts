// app/api/shiprocket-operations/route.ts
//
// Handles all ShipRocket actions for orders:
//   POST   ?action=create        — create SR order from your order_id
//   GET    ?action=track&order_id=OR123  — get tracking by order_id
//   GET    ?action=track_awb&awb=XYZ     — get tracking by AWB
//   GET    ?action=pickup_locations      — list pickup locations
//   POST   ?action=cancel       — cancel SR order

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/order";
import {
  srCreateOrder,
  srTrackByShipmentId,
  srTrackByAWB,
  srGetPickupLocations,
  srCancelOrder,
  buildSRPayload,
} from "@/lib/shiprocket";
import axios from "axios";

// ── POST — create or cancel ───────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const body   = await req.json();

    // ── CREATE ──────────────────────────────────────────────────────────────
    if (action === "create") {
      const { order_id } = body;
      if (!order_id) {
        return NextResponse.json({ success: false, message: "order_id required" }, { status: 400 });
      }

      // Fetch your order from DB
      const order = await Order.findOne({ order_id }).lean() as any;
      if (!order) {
        return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
      }

      // Fetch office for pickup address (optional — used for pickup_location name)
      let office = null;
      try {
        const officeRes = await axios.get(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/office-operations`
        );
        office = officeRes?.data?.data;
      } catch { /* office is optional */ }

      // Build SR payload from your order
      const srPayload = buildSRPayload(order, office);

      // Call ShipRocket
      const srResponse = await srCreateOrder(srPayload);

      // Save SR data back to your order's shipping field
      await Order.findOneAndUpdate(
        { order_id },
        {
          $set: {
            "shipping.sr_order_id":   String(srResponse.order_id   || ""),
            "shipping.sr_shipment_id": String(srResponse.shipment_id || ""),
            "shipping.awb_code":      srResponse.awb_code   || "",
            "shipping.courier_name":  srResponse.courier_name || "",
            "shipping.tracking_url":  srResponse.awb_code
              ? `https://shiprocket.co/tracking/${srResponse.awb_code}`
              : "",
            "shipping.updated_at": new Date(),
          },
        }
      );

      return NextResponse.json({
        success:     true,
        sr_order_id: srResponse.order_id,
        shipment_id: srResponse.shipment_id,
        awb_code:    srResponse.awb_code,
        status:      srResponse.status,
        message:     "ShipRocket order created",
      });
    }

    // ── CANCEL ───────────────────────────────────────────────────────────────
    if (action === "cancel") {
      const { sr_order_ids } = body; // array of SR numeric order ids
      if (!sr_order_ids?.length) {
        return NextResponse.json({ success: false, message: "sr_order_ids required" }, { status: 400 });
      }
      const result = await srCancelOrder(sr_order_ids);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });

  } catch (error: any) {
    console.error("ShipRocket POST error:", error?.response?.data || error.message);
    return NextResponse.json(
      { success: false, message: error?.response?.data?.message || error.message || "Failed" },
      { status: 500 }
    );
  }
}

// ── GET — track or pickup locations ──────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // ── TRACK BY order_id (use sr_shipment_id stored in order) ──────────────
    if (action === "track") {
      const order_id = searchParams.get("order_id");
      if (!order_id) {
        return NextResponse.json({ success: false, message: "order_id required" }, { status: 400 });
      }

      await connectDB();
      const order = await Order.findOne({ order_id }).lean() as any;
      if (!order) {
        return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
      }

      const shipment_id = order.shipping?.sr_shipment_id;
      const awb         = order.shipping?.awb_code;

      if (!shipment_id && !awb) {
        return NextResponse.json({
          success: false,
          message: "No ShipRocket shipment found for this order. Create SR order first.",
        }, { status: 404 });
      }

      // Prefer AWB tracking (more detailed), fallback to shipment_id
      const trackData = awb
        ? await srTrackByAWB(awb)
        : await srTrackByShipmentId(shipment_id);

      // Map SR status → your order_status
      const srStatus   = trackData?.tracking_data?.shipment_status || "";
      const ourStatus  = mapSRStatus(srStatus);

      // Update order shipping fields from tracking response
      const tracking = trackData?.tracking_data;
      if (tracking) {
        await Order.findOneAndUpdate(
          { order_id },
          {
            $set: {
              order_status:                       ourStatus || order.order_status,
              "shipping.courier_name":            tracking.courier_name   || order.shipping?.courier_name || "",
              "shipping.tracking_id":             awb || shipment_id,
              "shipping.tracking_url":            awb ? `https://shiprocket.co/tracking/${awb}` : "",
              "shipping.estimated_delivery":      tracking.etd            || "",
              "shipping.dispatch_date":           tracking.awb_assigned_date?.split(" ")[0] || "",
              "shipping.updated_at":              new Date(),
            },
          }
        );
      }

      return NextResponse.json({
        success:     true,
        order_id,
        status:      ourStatus,
        sr_status:   srStatus,
        tracking:    tracking || {},
        awb:         awb || "",
      });
    }

    // ── TRACK BY AWB directly ────────────────────────────────────────────────
    if (action === "track_awb") {
      const awb = searchParams.get("awb");
      if (!awb) {
        return NextResponse.json({ success: false, message: "awb required" }, { status: 400 });
      }
      const data = await srTrackByAWB(awb);
      return NextResponse.json({ success: true, data });
    }

    // ── PICKUP LOCATIONS ─────────────────────────────────────────────────────
    if (action === "pickup_locations") {
      const locations = await srGetPickupLocations();
      return NextResponse.json({ success: true, data: locations });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });

  } catch (error: any) {
    console.error("ShipRocket GET error:", error?.response?.data || error.message);
    return NextResponse.json(
      { success: false, message: error?.response?.data?.message || error.message || "Failed" },
      { status: 500 }
    );
  }
}

// ── Map ShipRocket shipment status → your order_status ───────────────────────
function mapSRStatus(srStatus: string): string {
  const status = srStatus?.toUpperCase() || "";
  if (status.includes("DELIVERED"))        return "delivered";
  if (status.includes("OUT FOR DELIVERY")) return "out_for_delivery";
  if (status.includes("IN TRANSIT"))       return "dispatched";
  if (status.includes("PICKED UP"))        return "dispatched";
  if (status.includes("SHIPPED"))          return "dispatched";
  if (status.includes("MANIFEST"))         return "packed";
  if (status.includes("RETURN"))           return "returned";
  if (status.includes("CANCEL"))           return "cancelled";
  return "";  // don't override if unknown
}