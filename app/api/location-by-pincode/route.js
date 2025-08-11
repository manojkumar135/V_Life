import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic"; // Optional: disable caching for fresh results

// GET - Fetch location by pincode
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pincode = searchParams.get("pincode");

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { success: false, message: "Invalid or missing pincode" },
        { status: 400 }
      );
    }

    const response = await axios.get(
      `https://api.postalpincode.in/pincode/${pincode}`
    );
    const data = response.data?.[0];
    // console.log("API Response:", data);

    if (data?.Status === "Success" && data?.PostOffice?.length) {
      const firstPostOffice = data.PostOffice[0];
      return NextResponse.json(
        {
          success: true,
          data: {
            city: firstPostOffice.District || firstPostOffice.Block || "",
            state: firstPostOffice.State || "",
            country: firstPostOffice.Country || "India",
            postOffices: data.PostOffice,
          },
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, message: "No location found for this pincode" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error in GET /api/location-by-pincode:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
