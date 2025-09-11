// wallets-operations/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Wallet } from "@/models/wallet";
import mongoose from "mongoose";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";

// Helper: Find wallet by either ObjectId or wallet_id
async function findWalletByIdOrWalletId(idOrWalletId) {
  if (mongoose.Types.ObjectId.isValid(idOrWalletId)) {
    return Wallet.findById(idOrWalletId);
  }
  return Wallet.findOne({ wallet_id: idOrWalletId });
}

// POST - Create new wallet
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    if (!body.user_id || !body.user_name || !body.account_holder_name || !body.bank_name || !body.account_number || !body.ifsc_code) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const wallet_id = await generateUniqueCustomId("WA", Wallet, 8, 8);
    const newWallet = await Wallet.create({ ...body, wallet_id });

    return NextResponse.json({ success: true, data: newWallet }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET - Fetch all wallets OR single wallet
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id") || searchParams.get("wallet_id");
    const search = searchParams.get("search") || "";

    // ✅ Get single wallet
    if (id) {
      const wallet = await findWalletByIdOrWalletId(id);
      if (!wallet) {
        return NextResponse.json({ success: false, message: "Wallet not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: wallet });
    }

    // ✅ Build search query
    const query = {};
    if (search) {
      const terms = search.split(",").map((t) => t.trim()).filter(Boolean);
      query.$or = terms.flatMap((term) => {
        const regex = new RegExp(term, "i");
        return [
          { wallet_id: regex },
          { user_id: regex },
          { user_name: regex },
          { account_holder_name: regex },
          { bank_name: regex },
          { account_number: regex },
          { ifsc_code: regex },
          { wallet_status: regex },
        ];
      });
    }

    const wallets = await Wallet.find(query);
    return NextResponse.json({ success: true, data: wallets });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT - Replace wallet
export async function PUT(request) {
  try {
    await connectDB();
    const { id, wallet_id, ...updates } = await request.json();
    const updateId = id || wallet_id;

    if (!updateId) {
      return NextResponse.json({ success: false, message: "ID or wallet_id is required" }, { status: 400 });
    }

    const wallet = await findWalletByIdOrWalletId(updateId);
    if (!wallet) {
      return NextResponse.json({ success: false, message: "Wallet not found" }, { status: 404 });
    }

    Object.assign(wallet, updates);
    await wallet.save();

    return NextResponse.json({ success: true, data: wallet });
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

    const body = await request.json();
    const { id, wallet_id, ...updates } = body;

    const updateId = id || wallet_id || walletIdFromQuery;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID or wallet_id is required" },
        { status: 400 }
      );
    }

    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(updateId) ? updateId : null },
          { wallet_id: updateId },
        ],
      },
      { $set: updates },  // ✅ dynamically updates all fields in payload
      { new: true, runValidators: true } // return updated doc
    ).lean();

    if (!updatedWallet) {
      return NextResponse.json(
        { success: false, message: "Wallet not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedWallet });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}



// DELETE - Remove wallet
export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const walletIdParam = searchParams.get("wallet_id");

    const deleteId = idParam || walletIdParam;
    if (!deleteId) {
      return NextResponse.json({ success: false, message: "ID or wallet_id is required" }, { status: 400 });
    }

    const wallet = await findWalletByIdOrWalletId(deleteId);
    if (!wallet) {
      return NextResponse.json({ success: false, message: "Wallet not found" }, { status: 404 });
    }

    await wallet.deleteOne();
    return NextResponse.json({ success: true, message: "Wallet deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
