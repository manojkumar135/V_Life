import { connectDB } from "@/lib/mongodb";
import { Login } from "@/models/login";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  try {
    await connectDB();
    const { user_id, theme } = await request.json();

    // Validate input
    if (!user_id || theme == null) {
      return NextResponse.json(
        { success: false, message: "user_id and theme are required" },
        { status: 400 }
      );
    }

    // Only allow allowed theme values
    const allowedThemes = ["light", "dark", "system"];
    if (!allowedThemes.includes(theme)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid theme. Allowed: ${allowedThemes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Add or update theme
    const updatedUser = await Login.findOneAndUpdate(
      { user_id },
      { $set: { theme, last_modified_at: new Date() } },
      { new: true } // return updated document
    );

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Theme ${updatedUser.theme ? "updated" : "added"} successfully`,
      theme: updatedUser.theme,
    });
  } catch (error: any) {
    console.error("Error updating theme:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update theme",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
