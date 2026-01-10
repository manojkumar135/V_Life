import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { Wallet } from "@/models/wallet";

/* =====================================================
   GET : Search user by user_id | mail | contact
===================================================== */
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    if (!search) {
      return NextResponse.json(
        { success: false, message: "Search parameter is required" },
        { status: 400 }
      );
    }

    const user = (await User.findOne({
      $or: [
        { user_id: search },
        { mail: search },
        { contact: search },
      ],
    }).lean()) as any;

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const wallet = await Wallet.findOne({
      user_id: user.user_id,
    }).lean();

    /* ✅ COMBINE USER + WALLET */
    const combinedData = {
      ...user,
      ...(wallet || {}),
    };

    return NextResponse.json(
      {
        success: true,
        data: combinedData,
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


/* =====================================================
   PATCH : Update User and/or Wallet
===================================================== */
export async function PATCH(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const { user_id, userUpdates, walletUpdates } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "user_id is required" },
        { status: 400 }
      );
    }

    let updatedUser = null;
    let updatedWallet = null;

    /* ---------- Update User ---------- */
    if (userUpdates && Object.keys(userUpdates).length > 0) {
      updatedUser = await User.findOneAndUpdate(
        { user_id },
        { $set: userUpdates },
        { new: true }
      );
    }

    /* ---------- Update Wallet ---------- */
    if (walletUpdates && Object.keys(walletUpdates).length > 0) {
      updatedWallet = await Wallet.findOneAndUpdate(
        { user_id },
        { $set: walletUpdates },
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
        data: {
          user: updatedUser,
          wallet: updatedWallet,
        },
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
