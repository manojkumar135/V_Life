import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { Wallet } from "@/models/wallet";
import { Login } from "@/models/login";

/* =====================================================
   HELPER — strips "", null, undefined, and plain {}
   from any object before it reaches Mongoose.
   Plain {} appears when a File field is sent over JSON
   without being uploaded first (File → JSON → {}).
   Since the frontend now uploads files to S3 before
   calling this route, {} should never arrive here —
   but this guard stays as a safety net.
===================================================== */
const cleanObject = (obj: any): Record<string, any> =>
  Object.fromEntries(
    Object.entries(obj || {}).filter(([, v]) => {
      if (v === "" || v === null || v === undefined) return false;
      if (
        typeof v === "object" &&
        !(v instanceof File) &&
        Object.keys(v).length === 0
      )
        return false;
      return true;
    }),
  );

/* =====================================================
   GET : Search user by user_id | mail | contact
         ?passkey=true  → returns login_key (plain) for admin
===================================================== */
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const fetchPasskey = searchParams.get("passkey") === "true";

    if (!search) {
      return NextResponse.json(
        { success: false, message: "Search parameter is required" },
        { status: 400 },
      );
    }

    // ── Admin fetching passkey only ───────────────────────────────────────
    if (fetchPasskey) {
      const loginRecord = (await Login.findOne({ user_id: search })
        .select("login_key")
        .lean()) as any;

      return NextResponse.json(
        { success: true, login_key: loginRecord?.login_key || null },
        { status: 200 },
      );
    }

    // ── Normal user search ────────────────────────────────────────────────
    const user = (await User.findOne({
      $or: [{ user_id: search }, { mail: search }, { contact: search }],
    }).lean()) as any;

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    const wallet = await Wallet.findOne({ user_id: user.user_id }).lean();

    const combinedData = { ...user, ...(wallet || {}) };

    return NextResponse.json(
      { success: true, data: combinedData },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/* =====================================================
   PATCH : Update User and/or Wallet  (plain JSON only)

   Two operation modes — both sent as application/json:

   ── A) Generate passkey ─────────────────────────────
   Body: { generatePasskey: { user_id: string } }

   ── B) Profile + KYC update ─────────────────────────
   Body: {
     user_id:       string,
     userUpdates:   { ...scalar user fields },
     walletUpdates: {
       ...scalar wallet fields,
       // File fields are S3 URLs (strings) uploaded by
       // the frontend BEFORE this call. No File objects
       // ever reach this route.
       bank_book?:    string,
       aadhar_front?: string,
       aadhar_back?:  string,
       cheque?:       string,
       pan_file?:     string,
     }
   }
===================================================== */
export async function PATCH(request: Request) {
  try {
    await connectDB();

    const body = await request.json();

    /* ── A) Generate passkey ─────────────────────────────────────────── */
    if (body.generatePasskey) {
      const { user_id } = body.generatePasskey;

      if (!user_id) {
        return NextResponse.json(
          { success: false, message: "user_id is required" },
          { status: 400 },
        );
      }

      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const plain = Array.from({ length: 10 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length)),
      ).join("");

      const hashed = await bcrypt.hash(plain, 10);

      const updated = await Login.findOneAndUpdate(
        { user_id },
        {
          $set: {
            passkey: hashed,
            login_key: plain,
            last_modified_at: new Date(),
          },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        return NextResponse.json(
          { success: false, message: "Login record not found for this user" },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Passkey generated successfully",
          login_key: plain,
        },
        { status: 200 },
      );
    }

    /* ── B) Normal profile + KYC update ─────────────────────────────── */
    const { user_id, userUpdates, walletUpdates } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "user_id is required" },
        { status: 400 },
      );
    }

    const cleanUserUpdates = cleanObject(userUpdates);
    const cleanWalletUpdates = cleanObject(walletUpdates);

    // Normalise pan_verified to boolean
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
        { returnDocument: "after" },
      );
    }

    if (Object.keys(cleanWalletUpdates).length) {
      updatedWallet = await Wallet.findOneAndUpdate(
        { user_id },
        { $set: cleanWalletUpdates },
        { returnDocument: "after", upsert: true },
      );
    }

    if (!updatedUser && !updatedWallet) {
      return NextResponse.json(
        { success: false, message: "Nothing to update" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Updated successfully",
        data: { user: updatedUser, wallet: updatedWallet },
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}