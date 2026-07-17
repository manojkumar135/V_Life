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
    const { address, landmark, locality, district, state, country, pincode } = user;

    // Build address parts, filter out empty/undefined
    const addressParts = [address, locality, district, state, country]
      .filter((part) => part && part.trim() !== "");

    // Join with commas
    let formattedAddress = addressParts.join(", ");

    // Add pincode if present
    if (pincode && pincode.toString().trim() !== "") {
      formattedAddress += ` - ${pincode} .`;
    }

    // ✅ NEW: separate structured fields, without touching the combined string above
    const details = {
      door_no: address || "",
      landmark: landmark || "",
      city: locality || district || "",
      state: state || "",
      country: country || "India",
      pincode: pincode ? pincode.toString() : "",
      locality: locality || "",
      district: district || "",
    };

    return NextResponse.json({
      success: true,
      address: formattedAddress.trim(), // unchanged, existing consumers still work
      details, // new — use this for form auto-fill
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}