import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/product";
import mongoose from "mongoose";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";

// 🔹 POST - Create new product
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    // Generate unique product_id with prefix "PR"
    const product_id = await generateUniqueCustomId("PR", Product, 8, 8);

    const newProduct = await Product.create({ ...body, product_id });

    // console.log(newProduct)

    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// 🔹 GET - Fetch all products OR single product by id/product_id
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const pv = Number(searchParams.get("pv"));
    const isFirstOrder = searchParams.get("is_first_order") === "true";
    const isAdvancePaid = searchParams.get("is_advance_paid") === "true";
    const userStatus = searchParams.get("user_status");
    const orderMode = searchParams.get("order_mode");

    let products = await Product.find({}).lean();

    // 🔒 1️⃣ PV locked (activation / button flow)
    if (pv && pv > 0) {
      products = products.filter((p) => Number(p.pv) === pv);
    }

    // 🆕 2️⃣ ADVANCE PAID + FIRST ORDER
    else if (isAdvancePaid) {
      products = products.filter(
        (p) => Number(p.pv) >= 100 && Number(p.dealer_price) >= 15000
      );
    }

    // 🔓 3️⃣ SELF + FIRST ORDER + INACTIVE
    else if (orderMode === "SELF" && isFirstOrder && userStatus === "inactive") {
      products = products.filter(
        (p) => Number(p.pv) === 50 || Number(p.pv) === 100
      );
    }

    return NextResponse.json(
      { success: true, data: products },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}


// 🔹 PUT - Replace a product
export async function PUT(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, product_id, status, ...rest } = body;

    const updateId = id || product_id;
    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "id or product_id is required" },
        { status: 400 }
      );
    }

    const updateFields: any = { ...rest };
    if (status !== undefined) updateFields.status = status;

    let updatedProduct;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedProduct = await Product.findByIdAndUpdate(updateId, updateFields, { new: true });
    } else {
      updatedProduct = await Product.findOneAndUpdate({ product_id: updateId }, updateFields, { new: true });
    }

    if (!updatedProduct) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// 🔹 PATCH - Partial update
export async function PATCH(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, product_id, ...updates } = body;

    const { searchParams } = new URL(request.url);
    const queryProductId = searchParams.get("product_id");

    const updateId = id || product_id || queryProductId;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "id or product_id is required" },
        { status: 400 }
      );
    }

    let updatedProduct;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedProduct = await Product.findByIdAndUpdate(updateId, updates, { new: true });
    } else {
      updatedProduct = await Product.findOneAndUpdate({ product_id: updateId }, updates, { new: true });
    }

    if (!updatedProduct) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedProduct }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// 🔹 DELETE - Remove a product
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const product_id = searchParams.get("product_id");

    let deletedProduct;
    if (mongoose.Types.ObjectId.isValid(id || "")) {
      deletedProduct = await Product.findByIdAndDelete(id);
    } else if (product_id) {
      deletedProduct = await Product.findOneAndDelete({ product_id });
    }

    if (!deletedProduct) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Product deleted" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
