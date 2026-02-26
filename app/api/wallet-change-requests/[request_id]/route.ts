import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { WalletChangeRequest } from "@/models/walletChangeRequest";
import { Wallet } from "@/models/wallet";
import { Login } from "@/models/login";
import { releaseOnHoldPayouts } from "@/app/api/wallets-operations/walletHelpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ request_id: string }> }
) {
  try {

    await connectDB();

    const { request_id } = await params;

    const body = await request.json();

    const { action, admin_id } = body;

    const changeRequest =
      await WalletChangeRequest.findOne({ request_id });

    if (!changeRequest)
      return NextResponse.json({
        success: false,
        message: "Request not found",
      });

    if (changeRequest.status !== "pending")
      return NextResponse.json({
        success: false,
        message: "Already processed",
      });

    // APPROVE
    if (action === "approved") {

      const wallet = await Wallet.findOne({
        wallet_id: changeRequest.wallet_id,
      });

      if (!wallet)
        return NextResponse.json({
          success: false,
          message: "Wallet not found",
        });

      Object.assign(wallet, changeRequest.new_values);

      wallet.last_modified_by = admin_id;

      wallet.last_modified_at = new Date();

      await wallet.save();

      // Sync Login
      const login = await Login.findOne({
        user_id: wallet.user_id,
      });

      if (login) {

        login.wallet_id = wallet.wallet_id;

        login.aadhar = wallet.aadhar_number;

        login.pan = wallet.pan_number;

        login.gst = wallet.gst_number || "";

        await login.save();

      }

      // Release payout
      if (wallet.pan_verified)
        await releaseOnHoldPayouts(wallet.user_id);

      changeRequest.status = "approved";
    }

    // REJECT
    if (action === "rejected") {

      changeRequest.status = "rejected";

    }

    changeRequest.reviewed_by = admin_id;

    changeRequest.reviewed_at = new Date();

    await changeRequest.save();

    return NextResponse.json({
      success: true,
      message: `Request ${action}`,
      data: changeRequest,
    });

  } catch (error: any) {

    return NextResponse.json({
      success: false,
      message: error.message,
    });

  }
}