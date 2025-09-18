import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amountInRupees = body.amount;

    if (!amountInRupees) {
      return NextResponse.json({ success: false, error: "Missing amount" }, { status: 400 });
    }

    const options = {
      amount: Math.round(amountInRupees * 100), // ✅ convert rupees to paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({ order });
  } catch (err: any) {
    console.error("Razorpay order creation failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
