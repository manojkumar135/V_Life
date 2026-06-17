// app/api/shiprocket-operations/route.ts

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

      const order = await Order.findOne({ order_id }).lean() as any;
      if (!order) {
        return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
      }

      // Fetch office for pickup location name
      let office = null;
      try {
        const officeRes = await axios.get(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/office-operations`
        );
        office = officeRes?.data?.data;
      } catch { /* office optional */ }

      // Build base payload from order (items, date, sub_total)
      const srPayload = buildSRPayload(order, office);
      const overrides = body.overrides || {};

      // Admin form values ALWAYS win — override all billing fields completely
      srPayload.billing_customer_name = overrides.billing_customer_name || order.user_name || "";
      srPayload.billing_phone         = String(overrides.billing_phone  || order.contact  || "").replace(/\D/g, "").slice(-10);
      srPayload.billing_email         = overrides.billing_email  || order.mail    || "";
      srPayload.billing_address       = overrides.billing_address || order.address || "";
      srPayload.billing_address_2     = ""; // clear — don't mix office landmark
      srPayload.billing_city          = overrides.billing_city    || order.city    || "";
      srPayload.billing_pincode       = String(overrides.billing_pincode || order.pincode || "");
      srPayload.billing_state         = overrides.billing_state   || order.state   || "";
      srPayload.billing_country       = overrides.billing_country || order.country || "India";
      srPayload.payment_method        = (overrides.payment_method as "Prepaid" | "COD") || "Prepaid";
      srPayload.length                = Number(overrides.length)  || srPayload.length;
      srPayload.breadth               = Number(overrides.breadth) || srPayload.breadth;
      srPayload.height                = Number(overrides.height)  || srPayload.height;
      srPayload.weight                = Number(overrides.weight)  || srPayload.weight;

      // Store what was actually sent to SR (admin may have changed from order defaults)
      const shipmentAddress = {
        name:    srPayload.billing_customer_name,
        phone:   srPayload.billing_phone,
        email:   srPayload.billing_email,
        address: srPayload.billing_address,
        city:    srPayload.billing_city,
        pincode: srPayload.billing_pincode,
        state:   srPayload.billing_state,
        country: srPayload.billing_country,
      };

      console.log("SR Payload billing:", JSON.stringify(shipmentAddress));

      // Call ShipRocket
      const srResponse = await srCreateOrder(srPayload);

      console.log("SR Create Response:", JSON.stringify(srResponse));

      // ShipRocket returns: { sr_order_id, shipment_id, awb_code, status, ... }
      // Note: field is "sr_order_id" NOT "order_id" in the response
      const sr_order_id   = srResponse.order_id   || srResponse.sr_order_id   || "";
      const sr_shipment_id = srResponse.shipment_id || srResponse.sr_shipment_id || "";
      const awb_code      = srResponse.awb_code    || "";
      const courier_name  = srResponse.courier_name || "";

      // Save shipment details — store as "shipment_" prefix to distinguish
      // from the original order shipping details filled by admin
      await Order.findOneAndUpdate(
        { order_id },
        {
          $set: {
            "shipping.sr_order_id":    String(sr_order_id),
            "shipping.sr_shipment_id": String(sr_shipment_id),
            "shipping.awb_code":       awb_code,
            "shipping.courier_name":   courier_name,
            "shipping.tracking_url":   awb_code
              ? `https://shiprocket.co/tracking/${awb_code}`
              : "",
            "shipping.sr_status":      srResponse.status || "NEW",
            "shipping.updated_at":     new Date(),
            // Store actual shipment address (may differ from order address)
            "shipping.shipment_name":    shipmentAddress.name,
            "shipping.shipment_phone":   shipmentAddress.phone,
            "shipping.shipment_email":   shipmentAddress.email,
            "shipping.shipment_address": shipmentAddress.address,
            "shipping.shipment_city":    shipmentAddress.city,
            "shipping.shipment_pincode": shipmentAddress.pincode,
            "shipping.shipment_state":   shipmentAddress.state,
            "shipping.shipment_country": shipmentAddress.country,
          },
        }
      );

      return NextResponse.json({
        success:        true,
        sr_order_id:    sr_order_id,
        shipment_id:    sr_shipment_id,
        awb_code:       awb_code,
        status:         srResponse.status,
        message:        "ShipRocket order created",
      });
    }

    // ── CANCEL ───────────────────────────────────────────────────────────────
    if (action === "cancel") {
      const { sr_order_ids } = body;
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

    // ── TRACK ────────────────────────────────────────────────────────────────
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
          message: "No ShipRocket shipment found. Create shipment first.",
        }, { status: 404 });
      }

      // Prefer AWB tracking (more detailed), fallback to shipment_id
      const trackData = awb
        ? await srTrackByAWB(awb)
        : await srTrackByShipmentId(shipment_id);

      console.log("SR Track Response:", JSON.stringify(trackData));

      const tracking  = trackData?.tracking_data;
      const srStatus  = tracking?.shipment_status || trackData?.current_status || "";
      const ourStatus = mapSRStatus(srStatus);

      if (tracking) {
        const newAwb = tracking.awb_code || awb || "";
        await Order.findOneAndUpdate(
          { order_id },
          {
            $set: {
              order_status:                  ourStatus || order.order_status,
              "shipping.courier_partner":    tracking.courier_name || order.shipping?.courier_partner || "",
              "shipping.courier_name":       tracking.courier_name || "",
              "shipping.tracking_id":        newAwb || shipment_id,
              "shipping.awb_code":           newAwb,
              "shipping.tracking_url":       newAwb ? `https://shiprocket.co/tracking/${newAwb}` : "",
              "shipping.estimated_delivery": tracking.etd || "",
              "shipping.dispatch_date":      tracking.awb_assigned_date?.split(" ")?.[0] || "",
              "shipping.sr_status":          srStatus,
              "shipping.updated_at":         new Date(),
            },
          }
        );
      }

      return NextResponse.json({
        success:   true,
        order_id,
        status:    ourStatus,
        sr_status: srStatus,
        tracking:  tracking || trackData || {},
        awb:       awb || "",
      });
    }

    // ── TRACK BY AWB ─────────────────────────────────────────────────────────
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

// ── Map SR status → your order_status ────────────────────────────────────────
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