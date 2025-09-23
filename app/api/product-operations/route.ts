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
    const id = searchParams.get("id") || searchParams.get("product_id");
    const search = searchParams.get("search");

    if (id) {
      let product;
      if (mongoose.Types.ObjectId.isValid(id)) {
        product = await Product.findById(id);
      } else {
        product = await Product.findOne({ product_id: id });
      }

      if (!product) {
        return NextResponse.json(
          { success: false, message: "Product not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: product }, { status: 200 });
    }

    // ✅ build query for search
    let query: any = {};

    if (search) {
      const searchTerms = search
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      query.$or = searchTerms.flatMap((term) => {
        const regex = new RegExp("^" + term, "i");
        return [
          { product_id: regex },
          { name: regex },
          { description: regex },
          { category: regex },
          { status: regex },
        ];
      });
    }

    const products = await Product.find(query).sort({ created_at: -1 });

    return NextResponse.json({ success: true, data: products }, { status: 200 });
  } catch (error: any) {
    console.error("GET products error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
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
