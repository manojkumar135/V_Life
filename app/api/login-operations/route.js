import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Login } from "@/models/login";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";


// POST - Create new login
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const newLogin = await Login.create(body);
    return NextResponse.json({ success: true, data: newLogin }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET - Fetch all logins OR single login by id or login_id
export async function GET(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { loginId, password } = body;

    if (!loginId || !password) {
      return NextResponse.json(
        { success: false, message: "User ID/Contact and password are required" },
        { status: 400 }
      );
    }

    // find user by user_id OR contact
    const user = await Login.findOne({
      $or: [{ login_id: loginId }, { contact: loginId }],
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid User ID or Contact" },
        { status: 404 }
      );
    }

    // check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Incorrect password" },
        { status: 401 }
      );
    }

    // ✅ login success
    return NextResponse.json({ success: true, data: user }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// PUT - Replace a login record
export async function PUT(request) {
  try {
    await connectDB();
    const { id, login_id, ...rest } = await request.json();
    const updateId = id || login_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }

    let updatedLogin;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedLogin = await Login.findByIdAndUpdate(updateId, rest, { new: true });
    } else {
      updatedLogin = await Login.findOneAndUpdate({ login_id: updateId }, rest, { new: true });
    }

    if (!updatedLogin) {
      return NextResponse.json({ success: false, message: "Login not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedLogin }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await connectDB();
    const { _id, user_id, login_id, items, ...updates } = await request.json();

    // Check which identifier is provided
    let query = {};
    if (_id) {
      query = { _id };
    } else if (user_id) {
      query = { user_id };
    } else if (login_id) {
      query = { login_id };
    } else {
      return NextResponse.json({ success: false, message: "User identifier is required" }, { status: 400 });
    }

    // If items are provided, update the cart
    if (items !== undefined && Array.isArray(items)) {
      // Transform items to match the OrderItemSchema requirements
      updates.items = items.map(item => ({
        id: item.product_id || String(item.id || ''),
        product: item.product_id || String(item.id || ''), // Use product_id for product field
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price, // Map price to unit_price
        price: item.price , // Calculate total price
        description: item.description || '',
        category: item.category,
        image: item.image,
        created_at: item.created_at || new Date().toISOString()
      }));
    }

    const updatedLogin = await Login.findOneAndUpdate(
      query,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedLogin) {
      return NextResponse.json({ success: false, message: "Login not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedLogin }, { status: 200 });
  } catch (error) {
    console.error("Error updating login:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE - Remove a login
export async function DELETE(request) {
  try {
    await connectDB();
    const { id, login_id } = await request.json();
    const deleteId = id || login_id;

    let deletedLogin;
    if (mongoose.Types.ObjectId.isValid(deleteId)) {
      deletedLogin = await Login.findByIdAndDelete(deleteId);
    } else {
      deletedLogin = await Login.findOneAndDelete({ login_id: deleteId });
    }

    if (!deletedLogin) {
      return NextResponse.json({ success: false, message: "Login not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Login deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
