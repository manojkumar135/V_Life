import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import { Booking } from "@/models/bookings";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";

// ✅ POST — Create new booking
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    // Generate unique booking_id with prefix "BK"
    const booking_id = await generateUniqueCustomId("BK", Booking, 8, 8);

    const newBooking = await Booking.create({
      ...body,
      booking_id,
    });

    return NextResponse.json(
      { success: true, data: newBooking },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST Booking Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create booking" },
      { status: 500 }
    );
  }
}

// ✅ GET — Fetch all or single booking (by id / booking_id / user_id)
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const booking_id = searchParams.get("booking_id");
    const user_id = searchParams.get("user_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // 🔹 Single booking fetch
    if (id || booking_id) {
      const lookupId = id || booking_id;
      let booking;

      if (lookupId && mongoose.Types.ObjectId.isValid(lookupId)) {
        booking = await Booking.findById(lookupId).populate("rewards.reward_id");
      } else {
        booking = await Booking.findOne({ booking_id: lookupId }).populate(
          "rewards.reward_id"
        );
      }

      if (!booking) {
        return NextResponse.json(
          { success: false, message: "Booking not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: booking }, { status: 200 });
    }

    // 🔹 Build filter query
    const query: any = {};
    if (user_id) query.user_id = user_id;
    if (status) query.status = status;

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { booking_id: regex },
        { user_name: regex },
        { "rewards.reward_name": regex },
      ];
    }

    const bookings = await Booking.find(query)
      .populate("rewards.reward_id")
      .sort({ booked_at: -1 });

    return NextResponse.json({ success: true, data: bookings }, { status: 200 });
  } catch (error: any) {
    console.error("GET Booking Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

// ✅ PUT — Full update (replace fields)
export async function PUT(request: Request) {
  try {
    await connectDB();
    const { id, booking_id, ...rest } = await request.json();
    const updateId = id || booking_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID or booking_id is required" },
        { status: 400 }
      );
    }

    let updatedBooking;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedBooking = await Booking.findByIdAndUpdate(updateId, rest, {
        new: true,
      });
    } else {
      updatedBooking = await Booking.findOneAndUpdate(
        { booking_id: updateId },
        rest,
        { new: true }
      );
    }

    if (!updatedBooking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedBooking }, { status: 200 });
  } catch (error: any) {
    console.error("PUT Booking Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update booking" },
      { status: 500 }
    );
  }
}

// ✅ PATCH — Partial update (status / rewards / etc.)
export async function PATCH(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, booking_id, ...rest } = body;

    const { searchParams } = new URL(request.url);
    const queryBookingId = searchParams.get("booking_id");

    const updateId = id || booking_id || queryBookingId;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "id or booking_id is required" },
        { status: 400 }
      );
    }

    let updatedBooking;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedBooking = await Booking.findByIdAndUpdate(updateId, rest, { new: true });
    } else {
      updatedBooking = await Booking.findOneAndUpdate(
        { booking_id: updateId },
        rest,
        { new: true }
      );
    }

    if (!updatedBooking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedBooking });
  } catch (error: any) {
    console.error("PATCH Booking Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to patch booking" },
      { status: 500 }
    );
  }
}

// ✅ DELETE — Delete booking by id or booking_id
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const booking_id = searchParams.get("booking_id");

    const targetId = id ?? booking_id;
    let deletedBooking;

    if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
      deletedBooking = await Booking.findByIdAndDelete(targetId);
    } else if (booking_id) {
      deletedBooking = await Booking.findOneAndDelete({ booking_id });
    } else {
      return NextResponse.json(
        { success: false, message: "Booking ID is required" },
        { status: 400 }
      );
    }

    if (!deletedBooking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Booking deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("DELETE Booking Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete booking" },
      { status: 500 }
    );
  }
}
