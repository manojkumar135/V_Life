// wallet-change-requests/[request_id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { WalletChangeRequest } from "@/models/walletChangeRequest";
import { Wallet } from "@/models/wallet";
import { Login } from "@/models/login";
import { Alert } from "@/models/alert";
import {
  releaseOnHoldPayouts,
} from "@/app/api/wallets-operations/walletHelpers";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";

/* ------------------------------------------------------------------ */
/* 🔹 Helper - format date DD-MM-YYYY                                  */
/* ------------------------------------------------------------------ */

function formatDate(date: Date): string {
  const dd   = String(date.getDate()).padStart(2, "0");
  const mm   = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ request_id: string }> }
) {
  try {
    await connectDB();

    const { request_id } = await params;
    const body = await request.json();
    const { action, admin_id } = body;

    const changeRequest = await WalletChangeRequest.findOne({ request_id });

    if (!changeRequest) {
      return NextResponse.json(
        { success: false, message: "Request not found" },
        { status: 404 }
      );
    }

    if (changeRequest.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "Already processed" },
        { status: 400 }
      );
    }

    const now           = new Date();
    const formattedDate = formatDate(now);
    const userId        = changeRequest.user_id;
    const isNewWallet   =
      changeRequest.request_type === "new_wallet" ||
      (!changeRequest.request_type && !changeRequest.wallet_id);
    const requestLabel  = isNewWallet ? "Wallet Creation" : "Wallet Update";

    // ─── APPROVE ─────────────────────────────────────────────────────────────
    if (action === "approved") {

      // ── NEW WALLET ──────────────────────────────────────────────────────────
      if (isNewWallet) {

        const existingWallet = await Wallet.findOne({ user_id: userId });

        if (existingWallet) {
          return NextResponse.json(
            { success: false, message: "A wallet already exists for this user" },
            { status: 400 }
          );
        }

        const wallet_id = await generateUniqueCustomId("WA", Wallet, 8, 8);

        await Wallet.create({
          ...changeRequest.new_values,
          wallet_id,
          wallet_status: "active",
          created_by: changeRequest.requested_by,
        });

        // Sync Login
        const login = await Login.findOne({ user_id: userId });
        if (login) {
          login.wallet_id = wallet_id;
          login.aadhar    = changeRequest.new_values?.aadhar_number || "";
          login.pan       = changeRequest.new_values?.pan_number    || "";
          login.gst       = changeRequest.new_values?.gst_number    || "";
          await login.save();
        }

        if (changeRequest.new_values?.pan_verified) {
          await releaseOnHoldPayouts(userId);
        }
      }

      // ── UPDATE WALLET ───────────────────────────────────────────────────────
      else {

        const wallet = await Wallet.findOne({
          wallet_id: changeRequest.wallet_id,
        });

        if (!wallet) {
          return NextResponse.json(
            { success: false, message: "Wallet not found" },
            { status: 404 }
          );
        }

        Object.assign(wallet, changeRequest.new_values);
        wallet.last_modified_by = admin_id;
        wallet.last_modified_at = now;
        await wallet.save();

        // Sync Login
        const login = await Login.findOne({ user_id: wallet.user_id });
        if (login) {
          login.wallet_id = wallet.wallet_id;
          login.aadhar    = wallet.aadhar_number;
          login.pan       = wallet.pan_number;
          login.gst       = wallet.gst_number || "";
          await login.save();
        }

        if (wallet.pan_verified) {
          await releaseOnHoldPayouts(wallet.user_id);
        }
      }

      /* ── Alert: notify user their request was approved ─────────────────── */
      await Alert.create({
        role:        "user",
        user_id:     userId,
        title:       `${requestLabel} Request Approved`,
        description: `Your ${requestLabel.toLowerCase()} request (${request_id}) has been approved by the admin.`,
        priority:    "high",
        date:        formattedDate,
        created_at:  now,
      });
    }

    // ─── REJECT ───────────────────────────────────────────────────────────────
    if (action === "rejected") {
      // Release payouts — wallet unchanged, no reason to keep them on hold
      await releaseOnHoldPayouts(userId);

      /* ── Alert: notify user their request was rejected ─────────────────── */
      await Alert.create({
        role:        "user",
        user_id:     userId,
        title:       `${requestLabel} Request Rejected`,
        description: `Your ${requestLabel.toLowerCase()} request (${request_id}) has been reviewed and rejected by the admin. Please contact support if you have questions.`,
        priority:    "high",
        date:        formattedDate,
        created_at:  now,
      });
    }

    // ─── Save status change (runs for BOTH approve and reject) ───────────────
    changeRequest.status      = action === "approved" ? "approved" : "rejected";
    changeRequest.reviewed_by = admin_id;
    changeRequest.reviewed_at = now;
    await changeRequest.save();

    return NextResponse.json({
      success: true,
      message: `Request ${action === "approved" ? "approved" : "rejected"} successfully`,
      data: changeRequest,
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}