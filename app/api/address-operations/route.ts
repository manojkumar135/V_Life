import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";

export async function POST(request: Request) {
  try {
    await connectDB();
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "user_id is required" },
        { status: 400 }
      );
    }

    // Fetch user by user_id
    const user = await User.findOne({ user_id });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Extract fields
    const {
      address,
      locality,
      district,
      state,
      country,
      pincode,
    } = user;

    // Format address
    const formattedAddress = `${address|| ""}, ${locality || ""}, ${district || ""}, ${state || ""}, ${country || ""} - ${pincode || ""}`
      .replace(/\s+,/g, ",") // clean up extra spaces before commas
      .replace(/,\s+,/g, ",") // remove double commas
      .replace(/,\s*$/, ""); // remove trailing comma

    return NextResponse.json({
      success: true,
      address: formattedAddress.trim(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
