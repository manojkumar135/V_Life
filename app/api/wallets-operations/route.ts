import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Wallet } from "@/models/wallet";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";

function formatField(str: string) {
  // Special cases that should always be uppercase
  const specialCases: Record<string, string> = {
    pan: "PAN",
    ifsc: "IFSC",
  };

  return str
    .split("_")
    .map((word) => {
      const lower = word.toLowerCase();
      if (specialCases[lower]) return specialCases[lower]; // PAN, IFSC
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

// Helper → Find wallet by either Mongo _id or wallet_id
async function findWalletByIdOrWalletId(id: string) {
  if (!id) return null;
  return await Wallet.findOne({ $or: [{ _id: id }, { wallet_id: id }] });
}

/**
 * GET → Fetch wallets
 */
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const user_id = searchParams.get("user_id") || "";
    const id = searchParams.get("id");
    const wallet_id = searchParams.get("wallet_id");

    // ✅ Fetch single wallet by id/wallet_id
    if (id || wallet_id) {
      const wallet = await findWalletByIdOrWalletId(id || wallet_id!);
      if (!wallet) {
        return NextResponse.json(
          { success: false, message: "Wallet not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: wallet });
    }

    let query: any = {};
    if (search) {
      query.$or = [
        { wallet_id: { $regex: search, $options: "i" } },
        { user_id: { $regex: search, $options: "i" } },
        { user_name: { $regex: search, $options: "i" } },
        { account_number: { $regex: search, $options: "i" } },
        { account_holder_name: { $regex: search, $options: "i" } },
        { bank_name: { $regex: search, $options: "i" } },
        { ifsc_code: { $regex: search, $options: "i" } },
        { aadhar_number: { $regex: search, $options: "i" } },
        { pan_number: { $regex: search, $options: "i" } },
        {wallet_status: { $regex: search, $options: "i" } },
      ];
    }
    if (user_id) {
      query.user_id = user_id;
    }

    const wallets = await Wallet.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: wallets });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST → Create new wallet
 */
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { user_id, account_number, aadhar_number, pan_number } = body;

    if (
      !user_id ||
      !body.user_name ||
      !body.account_holder_name ||
      !body.bank_name ||
      !account_number ||
      !body.ifsc_code
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ Check if this user already has a wallet
    const existingWallet = await Wallet.findOne({ user_id });
    if (existingWallet) {
      return NextResponse.json(
        { success: false, message: "This user already has a wallet" },
        { status: 400 }
      );
    }

    // ✅ Uniqueness check for account_number, aadhar_number, pan_number
    const duplicate = await Wallet.findOne({
      $or: [
        { account_number },
        ...(aadhar_number ? [{ aadhar_number }] : []),
        ...(pan_number ? [{ pan_number }] : []),
      ],
    });
    if (duplicate) {
      let field = "account_number";
      if (duplicate.aadhar_number === aadhar_number) field = "aadhar_number";
      if (duplicate.pan_number === pan_number) field = "pan_number";
      return NextResponse.json(
        { success: false, message: `${field} already exists.` },
        { status: 400 }
      );
    }

    const wallet_id = await generateUniqueCustomId("WA", Wallet, 8, 8);
    const newWallet = await Wallet.create({ ...body, wallet_id });

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

/**
 * PUT → Replace entire wallet
 */
export async function PUT(request: Request) {
  try {
    await connectDB();
    const { id, wallet_id, ...updates } = await request.json();
    const updateId = id || wallet_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID or wallet_id is required" },
        { status: 400 }
      );
    }

    const wallet = await findWalletByIdOrWalletId(updateId);
    if (!wallet) {
      return NextResponse.json(
        { success: false, message: "Wallet not found" },
        { status: 404 }
      );
    }

    const { user_id, account_number, aadhar_number, pan_number } = updates;

    // ✅ Prevent assigning wallet to a user that already has one
    if (user_id && user_id !== wallet.user_id) {
      const userWallet = await Wallet.findOne({ user_id });
      if (userWallet) {
        return NextResponse.json(
          { success: false, message: "This user already has a wallet" },
          { status: 400 }
        );
      }
    }

    // ✅ Uniqueness check
    if (account_number || aadhar_number || pan_number) {
      const duplicate = await Wallet.findOne({
        $and: [
          { _id: { $ne: wallet._id } },
          {
            $or: [
              ...(account_number ? [{ account_number }] : []),
              ...(aadhar_number ? [{ aadhar_number }] : []),
              ...(pan_number ? [{ pan_number }] : []),
            ],
          },
        ],
      });
      if (duplicate) {
        let field = "account_number";
        if (duplicate.aadhar_number === aadhar_number) field = "aadhar_number";
        if (duplicate.pan_number === pan_number) field = "pan_number";
        return NextResponse.json(
          { success: false, message: `${formatField(field)} must be unique` },
          { status: 400 }
        );
      }
    }

    Object.assign(wallet, updates);
    await wallet.save();

    return NextResponse.json({ success: true, data: wallet });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH → Update partial wallet fields
 */
export async function PATCH(request: Request) {
  try {
    await connectDB();

    // ✅ Get wallet_id from query params (if provided)
    const { searchParams } = new URL(request.url);
    const walletIdFromQuery =
      searchParams.get("wallet_id") || searchParams.get("id");

    // ✅ Get wallet_id from request body
    const body = await request.json();
    const { id, wallet_id, ...updates } = body;

    const updateId = id || wallet_id || walletIdFromQuery;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID or wallet_id is required" },
        { status: 400 }
      );
    }

    const wallet = await findWalletByIdOrWalletId(updateId);
    if (!wallet) {
      return NextResponse.json(
        { success: false, message: "Wallet not found" },
        { status: 404 }
      );
    }

    const { user_id, account_number, aadhar_number, pan_number } = updates;

    // ✅ Prevent assigning wallet to a user that already has one
    if (user_id && user_id !== wallet.user_id) {
      const userWallet = await Wallet.findOne({ user_id });
      if (userWallet) {
        return NextResponse.json(
          { success: false, message: "This user already has a wallet" },
          { status: 400 }
        );
      }
    }

    // ✅ Uniqueness check
    if (account_number || aadhar_number || pan_number) {
      const duplicate = await Wallet.findOne({
        $and: [
          { _id: { $ne: wallet._id } },
          {
            $or: [
              ...(account_number ? [{ account_number }] : []),
              ...(aadhar_number ? [{ aadhar_number }] : []),
              ...(pan_number ? [{ pan_number }] : []),
            ],
          },
        ],
      });

      if (duplicate) {
        let field = "account_number";
        if (duplicate.aadhar_number === aadhar_number) field = "aadhar_number";
        if (duplicate.pan_number === pan_number) field = "pan_number";
        return NextResponse.json(
          { success: false, message: `${formatField(field)} already exists.` },
          { status: 400 }
        );
      }
    }

    Object.assign(wallet, updates);
    await wallet.save();

    return NextResponse.json({ success: true, data: wallet });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE → Remove wallet
 */
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const wallet_id = searchParams.get("wallet_id");
    const deleteId = id || wallet_id;

    if (!deleteId) {
      return NextResponse.json(
        { success: false, message: "ID or wallet_id is required" },
        { status: 400 }
      );
    }

    const wallet = await findWalletByIdOrWalletId(deleteId);
    if (!wallet) {
      return NextResponse.json(
        { success: false, message: "Wallet not found" },
        { status: 404 }
      );
    }

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
