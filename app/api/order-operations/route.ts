import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/order";
import mongoose from "mongoose";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";

// ----------------- Types -----------------
interface OrderItem {
  product_id: string;
  product: string;
  category: string;
  name: string;
  quantity: number;
  unit_price: number;
  price: number;
  description?: string;
  image?: string;
  created_at?: Date;
  created_by?: string;
  last_modified_by?: string;
  last_modified_at?: Date;
}

interface OrderPayload {
  id?: string;
  order_id?: string;
  user_id: string;
  user_name: string;
  contact: string;
  mail: string;
  address: string;
  payment_date: string;
  amount?: number;
  items: OrderItem[];
  created_at?: Date;
  created_by?: string;
  last_modified_by?: string;
  last_modified_at?: Date;
  order_status?: string;
  description?: string;
  payment_id?: string;
  payment_type?: string;
}

// ----------------- POST -----------------
export async function POST(request: Request) {
  try {
    await connectDB();
    const body: OrderPayload = await request.json();

    // Generate unique order_id with prefix "OR"
    const order_id = await generateUniqueCustomId("OR", Order, 8, 8);

    // Auto calculate amount if not passed
    const amount =
      body.amount ?? body.items.reduce((sum, item) => sum + item.price, 0);

    const newOrder = await Order.create({ ...body, order_id, amount });

    return NextResponse.json(
      { success: true, data: newOrder },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ----------------- GET -----------------
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || searchParams.get("order_id");

    if (id) {
      let order;

      // ✅ Check if it's ObjectId or custom order_id
      if (mongoose.Types.ObjectId.isValid(id)) {
        order = await Order.findById(id);
      } else {
        order = await Order.findOne({ order_id: id });
      }

      if (!order) {
        return NextResponse.json(
          { success: false, message: "Order not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: order }, { status: 200 });
    }

    // ✅ If no ID → return all orders
    const orders = await Order.find();
    return NextResponse.json({ success: true, data: orders }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ----------------- PUT -----------------
export async function PUT(request: Request) {
  try {
    await connectDB();
    const { id, order_id, ...rest }: OrderPayload = await request.json();
    const updateId = id || order_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID or order_id is required" },
        { status: 400 }
      );
    }

    let updatedOrder;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedOrder = await Order.findByIdAndUpdate(updateId, rest, {
        new: true,
      });
    } else {
      updatedOrder = await Order.findOneAndUpdate(
        { order_id: updateId },
        rest,
        { new: true }
      );
    }

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: updatedOrder },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ----------------- DELETE -----------------
export async function DELETE(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const orderIdParam = searchParams.get("order_id");

    let deletedOrder;

    if (orderIdParam && mongoose.Types.ObjectId.isValid(orderIdParam)) {
      deletedOrder = await Order.findByIdAndDelete(orderIdParam);
    } else if (orderIdParam) {
      deletedOrder = await Order.findOneAndDelete({ order_id: orderIdParam });
    } else if (idParam && mongoose.Types.ObjectId.isValid(idParam)) {
      deletedOrder = await Order.findByIdAndDelete(idParam);
    }

    if (!deletedOrder) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Order deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
