// app/api/booking-shiprocket-operations/route.ts
// Same as shiprocket-operations but for Bookings model

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/bookings";
import {
  srCreateOrder,
  srTrackByShipmentId,
  srTrackByAWB,
  srCancelOrder,
} from "@/lib/shiprocket";
import axios from "axios";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const body   = await req.json();

    // ── CREATE ──────────────────────────────────────────────────────────────
    if (action === "create") {
      const { booking_id } = body;
      if (!booking_id) {
        return NextResponse.json({ success: false, message: "booking_id required" }, { status: 400 });
      }

      const booking = await Booking.findOne({ booking_id }).lean() as any;
      if (!booking) {
        return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
      }

      const overrides = body.overrides || {};

      // Build SR payload directly from overrides (booking is the source of truth)
      const billingName    = overrides.billing_customer_name || booking.user_name  || "";
      const billingPhone   = String(overrides.billing_phone  || booking.user_contact || "").replace(/\D/g, "").slice(-10);
      const billingEmail   = overrides.billing_email  || booking.user_email || "";
      const billingAddress = overrides.billing_address || booking.address   || "";
      const billingCity    = overrides.billing_city    || booking.city      || "";
      const billingPincode = String(overrides.billing_pincode || booking.pincode || "");
      const billingState   = overrides.billing_state   || booking.state    || "";
      const billingCountry = overrides.billing_country || booking.country  || "India";
      const paymentMethod  = overrides.payment_method  || "Prepaid";

      // Fetch office for pickup location
      let office = null;
      try {
        const officeRes = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/office-operations`);
        office = officeRes?.data?.data;
      } catch { /* optional */ }

      // Use booking rewards as items (score bookings — list reward names)
      const items = (booking.rewards || []).map((r: any) => ({
        name:          r.reward_name || "Reward",
        sku:           r.reward_id   || booking.booking_id,
        units:         r.count       || 1,
        selling_price: 0,
        discount:      0,
        tax:           "0",
      }));

      // If no items, add a placeholder
      if (!items.length) {
        items.push({ name: "Booking Reward", sku: booking.booking_id, units: 1, selling_price: 0, discount: 0, tax: "0" });
      }

      const srPayload = {
        order_id:              booking.booking_id,
        order_date:            new Date().toISOString().slice(0, 16).replace("T", " "),
        pickup_location:       process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
        billing_customer_name: billingName,
        billing_last_name:     "",
        billing_address:       billingAddress,
        billing_address_2:     "",
        billing_city:          billingCity,
        billing_pincode:       billingPincode,
        billing_state:         billingState,
        billing_country:       billingCountry,
        billing_email:         billingEmail,
        billing_phone:         billingPhone,
        shipping_is_billing:   true,
        order_items:           items,
        payment_method:        paymentMethod as "Prepaid" | "COD",
        sub_total:             0,
        length:  Number(overrides.length)  || Number(process.env.SHIPROCKET_DEFAULT_LENGTH  || 10),
        breadth: Number(overrides.breadth) || Number(process.env.SHIPROCKET_DEFAULT_BREADTH || 10),
        height:  Number(overrides.height)  || Number(process.env.SHIPROCKET_DEFAULT_HEIGHT  || 10),
        weight:  Number(overrides.weight)  || Number(process.env.SHIPROCKET_DEFAULT_WEIGHT  || 0.5),
      };

      const shipmentAddress = {
        name:    billingName,
        phone:   billingPhone,
        email:   billingEmail,
        address: billingAddress,
        city:    billingCity,
        pincode: billingPincode,
        state:   billingState,
        country: billingCountry,
      };

      console.log("SR Booking Payload billing:", JSON.stringify(shipmentAddress));

      const srResponse = await srCreateOrder(srPayload);
      console.log("SR Booking Create Response:", JSON.stringify(srResponse));

      const sr_order_id    = srResponse.order_id   || srResponse.sr_order_id   || "";
      const sr_shipment_id = srResponse.shipment_id || srResponse.sr_shipment_id || "";
      const awb_code       = srResponse.awb_code    || "";
      const courier_name   = srResponse.courier_name || "";

      await Booking.findOneAndUpdate(
        { booking_id },
        {
          $set: {
            "shipping.sr_order_id":    String(sr_order_id),
            "shipping.sr_shipment_id": String(sr_shipment_id),
            "shipping.awb_code":       awb_code,
            "shipping.courier_name":   courier_name,
            "shipping.tracking_url":   awb_code ? `https://shiprocket.co/tracking/${awb_code}` : "",
            "shipping.sr_status":      srResponse.status || "NEW",
            "shipping.updated_at":     new Date(),
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
        success:     true,
        sr_order_id: sr_order_id,
        shipment_id: sr_shipment_id,
        awb_code:    awb_code,
        status:      srResponse.status,
        message:     "ShipRocket order created for booking",
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
    console.error("Booking SR POST error:", error?.response?.data || error.message);
    return NextResponse.json(
      { success: false, message: error?.response?.data?.message || error.message || "Failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // ── TRACK ────────────────────────────────────────────────────────────────
    if (action === "track") {
      const booking_id = searchParams.get("booking_id");
      if (!booking_id) {
        return NextResponse.json({ success: false, message: "booking_id required" }, { status: 400 });
      }

      await connectDB();
      const booking = await Booking.findOne({ booking_id }).lean() as any;
      if (!booking) {
        return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
      }

      const shipment_id = booking.shipping?.sr_shipment_id;
      const awb         = booking.shipping?.awb_code;

      if (!shipment_id && !awb) {
        return NextResponse.json({
          success: false,
          message: "No ShipRocket shipment found. Create shipment first.",
        }, { status: 404 });
      }

      const trackData = awb
        ? await srTrackByAWB(awb)
        : await srTrackByShipmentId(shipment_id);

      console.log("SR Booking Track Response:", JSON.stringify(trackData));

      const tracking  = trackData?.tracking_data;
      const srStatus  = tracking?.shipment_status || trackData?.current_status || "";
      const ourStatus = mapSRStatus(srStatus);

      if (tracking) {
        const newAwb = tracking.awb_code || awb || "";
        await Booking.findOneAndUpdate(
          { booking_id },
          {
            $set: {
              ...(ourStatus ? { status: ourStatus } : {}),
              "shipping.courier_partner":    tracking.courier_name || booking.shipping?.courier_partner || "",
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
        booking_id,
        status:    ourStatus,
        sr_status: srStatus,
        tracking:  tracking || trackData || {},
        awb:       awb || "",
      });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });

  } catch (error: any) {
    console.error("Booking SR GET error:", error?.response?.data || error.message);
    return NextResponse.json(
      { success: false, message: error?.response?.data?.message || error.message || "Failed" },
      { status: 500 }
    );
  }
}

function mapSRStatus(srStatus: string): string {
  const s = srStatus?.toUpperCase() || "";
  if (s.includes("DELIVERED"))        return "delivered";
  if (s.includes("OUT FOR DELIVERY")) return "dispatched";
  if (s.includes("IN TRANSIT"))       return "dispatched";
  if (s.includes("PICKED UP"))        return "dispatched";
  if (s.includes("SHIPPED"))          return "dispatched";
  if (s.includes("MANIFEST"))         return "booked";
  if (s.includes("RETURN"))           return "cancelled";
  if (s.includes("CANCEL"))           return "cancelled";
  return "";
}