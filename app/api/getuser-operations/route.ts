import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { Wallet } from "@/models/wallet";
import { Login } from "@/models/login";

/* =====================================================
   GET : Search user by user_id | mail | contact
         ?passkey=true  → returns login_key (plain passkey) for admin
===================================================== */
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const fetchPasskey = searchParams.get("passkey") === "true"; // ✅ NEW

    if (!search) {
      return NextResponse.json(
        { success: false, message: "Search parameter is required" },
        { status: 400 }
      );
    }

    // ✅ NEW: Admin fetching passkey (login_key) only
    if (fetchPasskey) {
      const loginRecord = (await Login.findOne({ user_id: search })
        .select("login_key")
        .lean()) as any;

      return NextResponse.json(
        {
          success: true,
          login_key: loginRecord?.login_key || null,
        },
        { status: 200 }
      );
    }

    // ── EXISTING: Normal user search ──────────────────────────────────────
    const user = (await User.findOne({
      $or: [{ user_id: search }, { mail: search }, { contact: search }],
    }).lean()) as any;

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const wallet = await Wallet.findOne({ user_id: user.user_id }).lean();

    const combinedData = {
      ...user,
      ...(wallet || {}),
    };

    return NextResponse.json(
      { success: true, data: combinedData },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/* =====================================================
   PATCH : Update User and/or Wallet
           Special case: body.generatePasskey → generate & save passkey only
===================================================== */
export async function PATCH(request: Request) {
  try {
    await connectDB();

    const body = await request.json();

    /* ── ✅ NEW: Generate passkey branch ───────────────────────────────── */
    if (body.generatePasskey) {
      const { user_id } = body.generatePasskey;

      if (!user_id) {
        return NextResponse.json(
          { success: false, message: "user_id is required" },
          { status: 400 }
        );
      }

      // Generate random 10-char passkey: letters + digits
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const plain = Array.from({ length: 10 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join("");

      // Hash passkey for login comparison
      const hashed = await bcrypt.hash(plain, 10);

      const updated = await Login.findOneAndUpdate(
        { user_id },
        {
          $set: {
            passkey: hashed,        // hashed — used during login bcrypt compare
            login_key: plain,       // plain — shown to admin only
            last_modified_at: new Date(),
          },
        },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json(
          { success: false, message: "Login record not found for this user" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Passkey generated successfully",
          login_key: plain, // return plain so UI can show immediately without extra fetch
        },
        { status: 200 }
      );
    }
    /* ─────────────────────────────────────────────────────────────────── */

    /* ── EXISTING: Normal user + wallet update ───────────────────────── */
    const { user_id, userUpdates, walletUpdates } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "user_id is required" },
        { status: 400 }
      );
    }

    const cleanObject = (obj: any) =>
      Object.fromEntries(
        Object.entries(obj || {}).filter(
          ([_, v]) => v !== "" && v !== null && v !== undefined
        )
      );

    const cleanUserUpdates = cleanObject(userUpdates);
    const cleanWalletUpdates = cleanObject(walletUpdates);

    if ("pan_verified" in cleanWalletUpdates) {
      cleanWalletUpdates.pan_verified =
        cleanWalletUpdates.pan_verified === true ||
        cleanWalletUpdates.pan_verified === "true";
    }

    let updatedUser = null;
    let updatedWallet = null;

    if (Object.keys(cleanUserUpdates).length) {
      updatedUser = await User.findOneAndUpdate(
        { user_id },
        { $set: cleanUserUpdates },
        { new: true }
      );
    }

    if (Object.keys(cleanWalletUpdates).length) {
      updatedWallet = await Wallet.findOneAndUpdate(
        { user_id },
        { $set: cleanWalletUpdates },
        { new: true, upsert: true }
      );
    }

    if (!updatedUser && !updatedWallet) {
      return NextResponse.json(
        { success: false, message: "Nothing to update" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Updated successfully",
        data: { user: updatedUser, wallet: updatedWallet },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}