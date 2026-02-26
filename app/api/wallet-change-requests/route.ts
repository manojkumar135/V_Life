import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { WalletChangeRequest } from "@/models/walletChangeRequest";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const user_id = searchParams.get("user_id");

    const query: any = {};

    if (status) query.status = status;

    if (user_id) query.user_id = user_id;

    const requests = await WalletChangeRequest.find(query)
      .sort({ created_at: -1 });

    return NextResponse.json({
      success: true,
      data: requests,
    });

  } catch (error: any) {

    return NextResponse.json({
      success: false,
      message: error.message,
    });

  }
}