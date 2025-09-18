import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.text(); // webhook sends raw body
    const receivedSignature = req.headers.get("x-razorpay-signature");

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (receivedSignature !== expectedSignature) {
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    // Handle events like payment captured, failed, refunded
    console.log("🔔 Razorpay Webhook Event:", event.event);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
