import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Wallet } from "@/models/wallet";
import mongoose from "mongoose";

// POST - Create new wallet
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const newWallet = await Wallet.create(body);
    return NextResponse.json({ success: true, data: newWallet }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET - Fetch all wallets OR single wallet by id / wallet_id
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || searchParams.get("wallet_id");

    if (id) {
      let wallet;
      if (mongoose.Types.ObjectId.isValid(id)) {
        wallet = await Wallet.findById(id);
      } else {
        wallet = await Wallet.findOne({ wallet_id: id });
      }

      if (!wallet) {
        return NextResponse.json({ success: false, message: "Wallet not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: wallet }, { status: 200 });
    }

    const wallets = await Wallet.find();
    return NextResponse.json({ success: true, data: wallets }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT - Replace a wallet
export async function PUT(request) {
  try {
    await connectDB();
    const { id, wallet_id, ...rest } = await request.json();
    const updateId = id || wallet_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID or wallet_id is required" },
        { status: 400 }
      );
    }

    let updatedWallet;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedWallet = await Wallet.findByIdAndUpdate(updateId, rest, { new: true });
    } else {
      updatedWallet = await Wallet.findOneAndUpdate({ wallet_id: updateId }, rest, { new: true });
    }

    if (!updatedWallet) {
      return NextResponse.json({ success: false, message: "Wallet not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedWallet }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH - Partial update
export async function PATCH(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const walletIdFromQuery = searchParams.get("wallet_id");

    const { id, wallet_id, ...updates } = await request.json();

    const finalWalletId = id || wallet_id || walletIdFromQuery;

    let updatedWallet;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      updatedWallet = await Wallet.findByIdAndUpdate(id, updates, { new: true });
    } else if (finalWalletId) {
      updatedWallet = await Wallet.findOneAndUpdate({ wallet_id: finalWalletId }, updates, { new: true });
    }

    if (!updatedWallet) {
      return NextResponse.json({ success: false, message: "Wallet not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedWallet });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE - Remove a wallet
export async function DELETE(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const walletIdParam = searchParams.get("wallet_id");

    let deletedWallet;

    // If walletIdParam looks like a Mongo ObjectId, delete by _id
    if (walletIdParam && mongoose.Types.ObjectId.isValid(walletIdParam)) {
      deletedWallet = await Wallet.findByIdAndDelete(walletIdParam);
    }
    // If walletIdParam is a string ID field
    else if (walletIdParam) {
      deletedWallet = await Wallet.findOneAndDelete({ wallet_id: walletIdParam });
    }
    // Or delete by explicit ?id= param
    else if (idParam && mongoose.Types.ObjectId.isValid(idParam)) {
      deletedWallet = await Wallet.findByIdAndDelete(idParam);
    }

    if (!deletedWallet) {
      return NextResponse.json({ success: false, message: "Wallet not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Wallet deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


