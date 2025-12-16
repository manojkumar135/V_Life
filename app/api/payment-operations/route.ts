import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ Amount is already in PAISE
    const amountInPaise = Number(body.amount);

    if (!amountInPaise || amountInPaise <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    // (Optional safety – ₹5,00,000 max)
    if (amountInPaise > 5_00_00_000) {
      return NextResponse.json(
        { success: false, error: "Amount exceeds allowed limit" },
        { status: 400 }
      );
    }

    const options = {
      amount: amountInPaise, // ✅ DO NOT multiply
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (err: any) {
    console.error("Razorpay order creation failed:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err?.error?.description ||
          err?.message ||
          "Razorpay order creation failed",
      },
      { status: 500 }
    );
  }
}
