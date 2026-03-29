import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { Wallet } from "@/models/wallet";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";

/* =====================================================
   HELPER — strips "", null, undefined, and plain {}
   from any object before it reaches Mongoose.
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

   Two operation modes:

   ── A) Generate passkey ─────────────────────────────
   Body: { generatePasskey: { user_id: string } }

   ── B) Partial profile + KYC update ─────────────────
   Body: {
     user_id:       string,
     userUpdates:   { ...only the scalar user fields being changed },
     walletUpdates: { ...only the scalar/file fields being changed }
   }

   Cross-collection sync (only when values are present):
     • contact   → also updated in Login.contact,   TreeNode.contact,   Wallet.contact
     • user_name → also updated in Login.user_name, TreeNode.name,      Wallet.user_name
     • mail      → also updated in Login.mail,      TreeNode.mail

   Wallet logic:
     1. Find existing wallet by user_id.
     2. If found  → $set only the provided fields (partial update).
     3. If NOT found → Wallet.create() with a generated wallet_id
        plus all provided fields + safe defaults for required fields.
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

    /* ── B) Partial profile + KYC update ─────────────────────────────── */
    const { user_id, userUpdates, walletUpdates } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "user_id is required" },
        { status: 400 },
      );
    }

    // Strip empty / null / undefined — only real values reach Mongoose
    const cleanUserUpdates   = cleanObject(userUpdates);
    const cleanWalletUpdates = cleanObject(walletUpdates);

    // Normalise pan_verified to boolean when present
    if ("pan_verified" in cleanWalletUpdates) {
      cleanWalletUpdates.pan_verified =
        cleanWalletUpdates.pan_verified === true ||
        cleanWalletUpdates.pan_verified === "true";
    }

    let updatedUser   = null;
    let updatedWallet = null;

    /* ── Update User only when there are fields to write ── */
    if (Object.keys(cleanUserUpdates).length) {
      updatedUser = await User.findOneAndUpdate(
        { user_id },
        { $set: cleanUserUpdates },
        { returnDocument: "after" },
      );
    }

    /* ── Cross-collection sync for contact, user_name, and mail ──────────
       These fields are stored in Login, TreeNode, and/or Wallet as well.
       We sync them whenever they appear in userUpdates (the source of truth
       for personal details). Each sync is fire-and-forget — we only update
       the specific field that changed, touching nothing else.
    ── */

    // Sync contact → Login.contact, TreeNode.contact, Wallet.contact
    if (cleanUserUpdates.contact) {
      await Promise.all([
        Login.updateOne(
          { user_id },
          { $set: { contact: cleanUserUpdates.contact } },
        ),
        TreeNode.updateOne(
          { user_id },
          { $set: { contact: cleanUserUpdates.contact } },
        ),
        // Wallet.contact is handled below inside the wallet block,
        // but we sync here too in case walletUpdates is empty.
        Wallet.updateOne(
          { user_id },
          { $set: { contact: cleanUserUpdates.contact } },
        ),
      ]);
    }

    // Sync user_name → Login.user_name, TreeNode.name, Wallet.user_name
    if (cleanUserUpdates.user_name) {
      await Promise.all([
        Login.updateOne(
          { user_id },
          { $set: { user_name: cleanUserUpdates.user_name } },
        ),
        TreeNode.updateOne(
          { user_id },
          { $set: { name: cleanUserUpdates.user_name } },
        ),
        // Wallet.user_name is handled below inside the wallet block,
        // but we sync here too in case walletUpdates is empty.
        Wallet.updateOne(
          { user_id },
          { $set: { user_name: cleanUserUpdates.user_name } },
        ),
      ]);
    }

    // Sync mail → Login.mail, TreeNode.mail
    if (cleanUserUpdates.mail) {
      await Promise.all([
        Login.updateOne(
          { user_id },
          { $set: { mail: cleanUserUpdates.mail } },
        ),
        TreeNode.updateOne(
          { user_id },
          { $set: { mail: cleanUserUpdates.mail } },
        ),
      ]);
    }

    /* ── Wallet: find → update OR create ──────────────────────────────
       Rules:
         • Existing wallet  → $set only the non-empty fields provided.
                              Never blank out existing values.
         • No wallet yet    → create ONLY when pan_number is present
                              (it is required by the Wallet schema).
                              If pan_number is absent, skip silently —
                              the admin can fill KYC details later.
       We do NOT use upsert:true to avoid wallet_id:null E11000 errors.
    ── */
    if (Object.keys(cleanWalletUpdates).length) {
      const existingWallet = await Wallet.findOne({ user_id });

      if (existingWallet) {
        // ── Wallet exists → partial update (only non-empty provided fields) ──
        updatedWallet = await Wallet.findOneAndUpdate(
          { user_id },
          { $set: cleanWalletUpdates },
          { returnDocument: "after" },
        );
      } else if (cleanWalletUpdates.pan_number) {
        // ── No wallet yet → only create when pan_number is supplied ──────
        // Fetch the user record to seed name / contact / mail / gender
        // into the new wallet (mirrors the registration pattern).
        const userRecord = (await User.findOne({ user_id }).lean()) as any;

        const wallet_id = await generateUniqueCustomId("WA", Wallet, 8, 8);

        updatedWallet = await Wallet.create({
          wallet_id,
          user_id,

          // Seed from user record, fall back to walletUpdates values
          user_name:       userRecord?.user_name ?? cleanWalletUpdates.user_name ?? "",
          contact:         userRecord?.contact   ?? cleanWalletUpdates.contact   ?? "",
          mail:            userRecord?.mail      ?? cleanWalletUpdates.mail      ?? "",
          gender:          userRecord?.gender    ?? cleanWalletUpdates.gender    ?? "",
          rank:            userRecord?.rank      ?? "",
          user_status:     "Active",
          wallet_status:   "Active",
          balance:         0,
          total_earnings:  0,
          total_withdrawn: 0,
          activated_date:  new Date(),
          created_by:      user_id,

          // Spread all the KYC / banking fields the admin is saving
          ...cleanWalletUpdates,
        });
      }
      // else: no wallet + no pan_number → skip wallet creation silently
    }

    if (!updatedUser && !updatedWallet && !Object.keys(cleanUserUpdates).length && !Object.keys(cleanWalletUpdates).length) {
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