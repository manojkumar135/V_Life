// wallet-change-requests/[request_id]/route.ts

import { NextResponse }          from "next/server";
import { connectDB }             from "@/lib/mongodb";
import { Wallet }                from "@/models/wallet";
import { Login }                 from "@/models/login";
import { Alert }                 from "@/models/alert";
import { WalletChangeRequest }   from "@/models/walletChangeRequest";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { releaseOnHoldPayouts }  from "@/app/api/wallets-operations/walletHelpers";

function formatDate(date: Date): string {
  const dd   = String(date.getDate()).padStart(2, "0");
  const mm   = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// ─── GET single request ────────────────────────────────────────────────────
export async function GET(
  request: Request,
  { params }: { params: { request_id: string } }
) {
  try {
    await connectDB();
    const { request_id } = params;

    const changeRequest = await WalletChangeRequest.findOne({ request_id });
    if (!changeRequest)
      return NextResponse.json(
        { success: false, message: "Request not found" },
        { status: 404 }
      );

    return NextResponse.json({ success: true, data: changeRequest });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ─── PATCH — approve or reject ────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: { request_id: string } }
) {
  try {
    await connectDB();

    const { request_id } = params;
    const body           = await request.json();
    const { action, reviewed_by } = body; // action: "approved" | "rejected"

    if (!action || !["approved", "rejected"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "action must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const changeRequest = await WalletChangeRequest.findOne({ request_id });
    if (!changeRequest)
      return NextResponse.json(
        { success: false, message: "Request not found" },
        { status: 404 }
      );

    if (changeRequest.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "Request is already processed" },
        { status: 400 }
      );
    }

    const now           = new Date();
    const formattedDate = formatDate(now);
    const { user_id }   = changeRequest;

    // ── APPROVED ──────────────────────────────────────────────────────────
    if (action === "approved") {
      const newValues = changeRequest.new_values as any;

      if (changeRequest.request_type === "new_wallet") {
        // Create the wallet for the first time
        const wallet_id = await generateUniqueCustomId("WA", Wallet, 8, 8);
        await Wallet.create({ ...newValues, wallet_id });

        const login = await Login.findOne({ user_id });
        if (login) {
          login.wallet_id = wallet_id                || login.wallet_id || "";
          login.aadhar    = newValues.aadhar_number  || login.aadhar    || "";
          login.pan       = newValues.pan_number     || login.pan       || "";
          login.gst       = newValues.gst_number     || login.gst       || "";
          await login.save();
        }

        // Wallet now exists → release payouts held for NO_WALLET / WALLET_UNDER_REVIEW
        await releaseOnHoldPayouts(user_id, "wallet_review_approved");

        await Alert.create({
          role:        "user",
          user_id,
          title:       "✅ Wallet Creation Approved",
          description: `Your wallet creation request (${request_id}) has been approved. Your wallet is now active.`,
          priority:    "high",
          read:        false,
          date:        formattedDate,
          created_at:  now,
        });

      } else {
        // Update existing wallet with new_values
        const wallet = await Wallet.findOne({ wallet_id: changeRequest.wallet_id });
        if (!wallet)
          return NextResponse.json(
            { success: false, message: "Wallet not found" },
            { status: 404 }
          );

        Object.assign(wallet, newValues);
        wallet.last_modified_by = reviewed_by || "admin";
        wallet.last_modified_at = now;
        await wallet.save();

        const login = await Login.findOne({ user_id });
        if (login) {
          login.wallet_id = wallet.wallet_id;
          login.aadhar    = wallet.aadhar_number;
          login.pan       = wallet.pan_number;
          login.gst       = wallet.gst_number || login.gst || "";
          await login.save();
        }

        // Wallet update approved → release payouts held for WALLET_UNDER_REVIEW
        await releaseOnHoldPayouts(user_id, "wallet_review_approved");

        await Alert.create({
          role:        "user",
          user_id,
          title:       "✅ Wallet Update Approved",
          description: `Your wallet update request (${request_id}) has been approved.`,
          priority:    "high",
          read:        false,
          date:        formattedDate,
          created_at:  now,
        });
      }

    // ── REJECTED ──────────────────────────────────────────────────────────
    } else {
      // Rejected — release WALLET_UNDER_REVIEW hold since the review is over.
      // payoutHoldService re-checks all conditions so if wallet is still
      // missing/inactive the payouts will remain OnHold for the correct reason.
      await releaseOnHoldPayouts(user_id, "wallet_review_approved");

      await Alert.create({
        role:        "user",
        user_id,
        title:       "❌ Wallet Request Rejected",
        description: `Your wallet request (${request_id}) was rejected. Please contact support or resubmit.`,
        priority:    "high",
        read:        false,
        date:        formattedDate,
        created_at:  now,
      });
    }

    // Mark request as approved / rejected
    changeRequest.status      = action;
    changeRequest.reviewed_by = reviewed_by || "admin";
    changeRequest.reviewed_at = now;
    await changeRequest.save();

    return NextResponse.json({
      success: true,
      message: `Request ${action} successfully`,
      data:    changeRequest,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}