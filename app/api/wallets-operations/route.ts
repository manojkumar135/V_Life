// wallets-operations/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Wallet } from "@/models/wallet";
import { Login } from "@/models/login";
import { Alert } from "@/models/alert";
import mongoose from "mongoose";
import { WalletChangeRequest } from "@/models/walletChangeRequest";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import {
  releaseOnHoldPayouts,
  putPayoutsOnHold,
} from "@/app/api/wallets-operations/walletHelpers";

/* ------------------------------------------------------------------ */
/* 🔹 Helper - format date DD-MM-YYYY                                  */
/* ------------------------------------------------------------------ */

function formatDate(date: Date): string {
  const dd   = String(date.getDate()).padStart(2, "0");
  const mm   = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/* ------------------------------------------------------------------ */
/* 🔹 Helper - raise alerts when a change request is submitted         */
/*                                                                     */
/*  Two alerts are created:                                            */
/*    1. To the USER who raised the request — confirmation             */
/*    2. To ADMIN — notification of a new pending request             */
/* ------------------------------------------------------------------ */

async function createChangeRequestAlerts({
  request_id,
  user_id,
  user_name,
  requestLabel,
}: {
  request_id: string;
  user_id:    string;
  user_name:  string;
  requestLabel: string; // "Wallet Creation" | "Wallet Update"
}) {
  const now           = new Date();
  const formattedDate = formatDate(now);

  // Alert → user who raised the request
  await Alert.create({
    role:        "user",
    user_id,
    title:       `${requestLabel} Request Submitted`,
    description: `Your ${requestLabel.toLowerCase()} request (${request_id}) has been submitted and is awaiting admin approval.`,
    priority:    "medium",
    date:        formattedDate,
    created_at:  now,
  });

  // Alert → admin
  await Alert.create({
    role:        "admin",
    title:       `New ${requestLabel} Request`,
    description: `User ${user_name || user_id} has raised a new ${requestLabel.toLowerCase()} request (${request_id}) that requires your approval.`,
    priority:    "high",
    date:        formattedDate,
    created_at:  now,
  });
}

function formatField(str: string) {
  const specialCases: Record<string, string> = { pan: "PAN", ifsc: "IFSC" };
  return str
    .split("_")
    .map((word) => {
      const lower = word.toLowerCase();
      if (specialCases[lower]) return specialCases[lower];
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

async function findWalletByIdOrWalletId(value: string) {
  if (!value) return null;
  const query: any[] = [];
  if (mongoose.Types.ObjectId.isValid(value)) query.push({ _id: value });
  query.push({ wallet_id: value });
  return await Wallet.findOne({ $or: query });
}

// ─── GET ───────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search    = searchParams.get("search")    || "";
    const user_id   = searchParams.get("user_id")   || "";
    const id        = searchParams.get("id");
    const wallet_id = searchParams.get("wallet_id");

    if (id || wallet_id) {
      const wallet = await findWalletByIdOrWalletId(id || wallet_id!);
      if (!wallet)
        return NextResponse.json(
          { success: false, message: "Wallet not found" },
          { status: 404 }
        );
      return NextResponse.json({ success: true, data: wallet });
    }

    let query: any = {};
    if (search) {
      query.$or = [
        { wallet_id:            { $regex: search, $options: "i" } },
        { user_id:              { $regex: search, $options: "i" } },
        { user_name:            { $regex: search, $options: "i" } },
        { account_number:       { $regex: search, $options: "i" } },
        { account_holder_name:  { $regex: search, $options: "i" } },
        { bank_name:            { $regex: search, $options: "i" } },
        { ifsc_code:            { $regex: search, $options: "i" } },
        { aadhar_number:        { $regex: search, $options: "i" } },
        { pan_number:           { $regex: search, $options: "i" } },
        { wallet_status:        { $regex: search, $options: "i" } },
      ];
    }
    if (user_id) query.user_id = user_id;

    const wallets = await Wallet.find(query).sort({
      last_modified_at: -1,
      created_at:       -1,
    });
    return NextResponse.json({ success: true, data: wallets });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ─── POST (Create wallet) ──────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      user_id,
      account_number,
      aadhar_number,
      pan_number,
      requested_role,
      last_modified_by,
    } = body;

    if (
      !user_id          ||
      !body.user_name   ||
      !body.account_holder_name ||
      !body.bank_name   ||
      !account_number   ||
      !body.ifsc_code
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingWallet = await Wallet.findOne({ user_id });
    if (existingWallet) {
      return NextResponse.json(
        { success: false, message: "This user already has a wallet" },
        { status: 400 }
      );
    }

    const duplicate = await Wallet.findOne({
      $or: [
        { account_number },
        ...(aadhar_number ? [{ aadhar_number }] : []),
        ...(pan_number    ? [{ pan_number }]    : []),
      ],
    });
    if (duplicate) {
      let field = "account_number";
      if (duplicate.aadhar_number === aadhar_number) field = "aadhar_number";
      if (duplicate.pan_number    === pan_number)    field = "pan_number";
      return NextResponse.json(
        { success: false, message: `${formatField(field)} already exists.` },
        { status: 400 }
      );
    }

    const role = requested_role || "user";

    // ── USER: raise a change request (new_wallet type) ───────────────────
    if (role === "user") {
      const existingRequest = await WalletChangeRequest.findOne({
        user_id,
        status:       "pending",
        request_type: "new_wallet",
      });

      if (existingRequest) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You already have a pending wallet creation request awaiting admin approval.",
          },
          { status: 400 }
        );
      }

      const request_id = await generateUniqueCustomId(
        "WCR",
        WalletChangeRequest,
        8,
        8
      );

      const changeRequest = await WalletChangeRequest.create({
        request_id,
        wallet_id:      null,
        user_id,
        request_type:   "new_wallet",
        requested_by:   last_modified_by || user_id,
        requested_role: role,
        old_values:     null,
        new_values:     { ...body },
        status:         "pending",
      });

      await putPayoutsOnHold(user_id);

      /* ── Alerts: user confirmation + admin notification ─────────────── */
      await createChangeRequestAlerts({
        request_id,
        user_id,
        user_name:    body.user_name || user_id,
        requestLabel: "Wallet Creation",
      });

      return NextResponse.json(
        {
          success: true,
          message:
            "Your wallet creation request has been submitted for admin approval.",
          data: changeRequest,
        },
        { status: 201 }
      );
    }

    // ── ADMIN: create wallet directly ────────────────────────────────────
    const wallet_id  = await generateUniqueCustomId("WA", Wallet, 8, 8);
    const newWallet  = await Wallet.create({ ...body, wallet_id });

    const login = await Login.findOne({ user_id });
    if (login) {
      login.wallet_id = wallet_id       || login.wallet_id || "";
      login.aadhar    = aadhar_number   || login.aadhar    || "";
      login.pan       = pan_number      || login.pan       || "";
      login.gst       = body.gst_number || login.gst       || "";
      await login.save();
    }

    if (newWallet.pan_verified || pan_number) {
      await releaseOnHoldPayouts(user_id);
    }

    return NextResponse.json(
      { success: true, data: newWallet },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ─── PUT ───────────────────────────────────────────────────────────────────
export async function PUT(request: Request) {
  try {
    await connectDB();
    const { id, wallet_id, aadhar_number, pan_number, ...updates } =
      await request.json();
    const updateId = id || wallet_id;
    if (!updateId)
      return NextResponse.json(
        { success: false, message: "ID or wallet_id is required" },
        { status: 400 }
      );

    const wallet = await findWalletByIdOrWalletId(updateId);
    if (!wallet)
      return NextResponse.json(
        { success: false, message: "Wallet not found" },
        { status: 404 }
      );

    const { user_id, account_number } = updates;

    if (user_id && user_id !== wallet.user_id) {
      const userWallet = await Wallet.findOne({ user_id });
      if (userWallet)
        return NextResponse.json(
          { success: false, message: "This user already has a wallet" },
          { status: 400 }
        );
    }

    if (account_number || aadhar_number || pan_number) {
      const duplicate = await Wallet.findOne({
        $and: [
          { _id: { $ne: wallet._id } },
          {
            $or: [
              ...(account_number ? [{ account_number }] : []),
              ...(aadhar_number  ? [{ aadhar_number }]  : []),
              ...(pan_number     ? [{ pan_number }]     : []),
            ],
          },
        ],
      });
      if (duplicate) {
        let field = "account_number";
        if (duplicate.aadhar_number === aadhar_number) field = "aadhar_number";
        if (duplicate.pan_number    === pan_number)    field = "pan_number";
        return NextResponse.json(
          { success: false, message: `${formatField(field)} must be unique` },
          { status: 400 }
        );
      }
    }

    Object.assign(wallet, updates);
    wallet.wallet_id     = wallet_id      || wallet.wallet_id     || "";
    wallet.aadhar_number = aadhar_number  || wallet.aadhar_number || "";
    wallet.pan_number    = pan_number     || wallet.pan_number    || "";
    wallet.gst_number    = updates.gst_number || wallet.gst_number || "";
    await wallet.save();

    const login = await Login.findOne({ user_id: wallet.user_id });
    if (login) {
      login.wallet_id = wallet.wallet_id;
      login.aadhar    = wallet.aadhar_number;
      login.pan       = wallet.pan_number;
      login.gst       = wallet.gst_number || login.gst || "";
      await login.save();
    }

    if (wallet.pan_verified || pan_number) {
      await releaseOnHoldPayouts(wallet.user_id);
    }

    return NextResponse.json({ success: true, data: wallet });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ─── PATCH (Edit wallet) ───────────────────────────────────────────────────
export async function PATCH(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const walletIdFromQuery =
      searchParams.get("wallet_id") || searchParams.get("id");

    const body = await request.json();
    const {
      id,
      wallet_id,
      aadhar_number,
      pan_number,
      last_modified_by,
      requested_role,
      ...updates
    } = body;

    const updateId = id || wallet_id || walletIdFromQuery;
    if (!updateId)
      return NextResponse.json(
        { success: false, message: "ID or wallet_id is required" },
        { status: 400 }
      );

    const wallet = await findWalletByIdOrWalletId(updateId);
    if (!wallet)
      return NextResponse.json(
        { success: false, message: "Wallet not found" },
        { status: 404 }
      );

    const { user_id, account_number } = updates;

    if (user_id && user_id !== wallet.user_id) {
      const userWallet = await Wallet.findOne({ user_id });
      if (userWallet)
        return NextResponse.json(
          { success: false, message: "This user already has a wallet" },
          { status: 400 }
        );
    }

    if (account_number || aadhar_number || pan_number) {
      const duplicate = await Wallet.findOne({
        $and: [
          { _id: { $ne: wallet._id } },
          {
            $or: [
              ...(account_number ? [{ account_number }] : []),
              ...(aadhar_number  ? [{ aadhar_number }]  : []),
              ...(pan_number     ? [{ pan_number }]     : []),
            ],
          },
        ],
      });
      if (duplicate) {
        let field = "account_number";
        if (duplicate.aadhar_number === aadhar_number) field = "aadhar_number";
        if (duplicate.pan_number    === pan_number)    field = "pan_number";
        return NextResponse.json(
          { success: false, message: `${formatField(field)} already exists.` },
          { status: 400 }
        );
      }
    }

    const role = requested_role || "user";

    // ── USER: create or update pending change request ────────────────────
    if (role === "user") {
      const newValues = {
        ...updates,
        aadhar_number: aadhar_number       || wallet.aadhar_number || "",
        pan_number:    pan_number          || wallet.pan_number    || "",
        gst_number:    updates.gst_number  || wallet.gst_number   || "",
      };

      const existingRequest = await WalletChangeRequest.findOne({
        wallet_id: wallet.wallet_id,
        status:    "pending",
      });

      if (existingRequest) {
        existingRequest.new_values    = newValues;
        existingRequest.requested_by  = last_modified_by || wallet.user_id;
        existingRequest.updated_at    = new Date();
        await existingRequest.save();

        return NextResponse.json({
          success: true,
          message: "Your pending request has been updated.",
          data:    existingRequest,
        });
      }

      const request_id = await generateUniqueCustomId(
        "WCR",
        WalletChangeRequest,
        8,
        8
      );

      const changeRequest = await WalletChangeRequest.create({
        request_id,
        wallet_id:      wallet.wallet_id,
        user_id:        wallet.user_id,
        request_type:   "update_wallet",
        requested_by:   last_modified_by || wallet.user_id,
        requested_role: role,
        old_values:     wallet.toObject(),
        new_values:     newValues,
        status:         "pending",
      });

      await putPayoutsOnHold(wallet.user_id);

      /* ── Alerts: user confirmation + admin notification ─────────────── */
      await createChangeRequestAlerts({
        request_id,
        user_id:      wallet.user_id,
        user_name:    wallet.user_name || wallet.user_id,
        requestLabel: "Wallet Update",
      });

      return NextResponse.json({
        success: true,
        message: "Your changes have been submitted for admin approval.",
        data:    changeRequest,
      });
    }

    // ── ADMIN: direct update ─────────────────────────────────────────────
    Object.assign(wallet, updates);
    wallet.wallet_id        = wallet_id       || wallet.wallet_id        || "";
    wallet.aadhar_number    = aadhar_number   || wallet.aadhar_number    || "";
    wallet.pan_number       = pan_number      || wallet.pan_number       || "";
    wallet.gst_number       = updates.gst_number || wallet.gst_number   || "";
    wallet.last_modified_by = last_modified_by   || wallet.last_modified_by || "";
    wallet.last_modified_at = new Date();
    await wallet.save();

    // Auto-approve any pending change request for this wallet
    const pendingRequest = await WalletChangeRequest.findOne({
      wallet_id: wallet.wallet_id,
      status:    "pending",
    });
    if (pendingRequest) {
      pendingRequest.status      = "approved";
      pendingRequest.reviewed_by = last_modified_by || "admin";
      pendingRequest.reviewed_at = new Date();
      await pendingRequest.save();
    }

    const login = await Login.findOne({ user_id: wallet.user_id });
    if (login) {
      login.wallet_id = wallet.wallet_id;
      login.aadhar    = wallet.aadhar_number;
      login.pan       = wallet.pan_number;
      login.gst       = wallet.gst_number || login.gst || "";
      await login.save();
    }

    if (wallet.pan_verified || pan_number) {
      await releaseOnHoldPayouts(wallet.user_id);
    }

    return NextResponse.json({
      success:  true,
      message:  "Wallet updated successfully",
      data:     wallet,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id        = searchParams.get("id");
    const wallet_id = searchParams.get("wallet_id");
    const deleteId  = id || wallet_id;

    if (!deleteId)
      return NextResponse.json(
        { success: false, message: "ID or wallet_id is required" },
        { status: 400 }
      );

    const wallet = await findWalletByIdOrWalletId(deleteId);
    if (!wallet)
      return NextResponse.json(
        { success: false, message: "Wallet not found" },
        { status: 404 }
      );

    await Wallet.deleteOne({ _id: wallet._id });

    return NextResponse.json({
      success: true,
      message: "Wallet deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}