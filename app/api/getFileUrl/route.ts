// app/api/getFileUrl/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadFileToS3Bucket } from "@/models/s3bucket";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
      );
    }

    // ✅ validate type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, message: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // convert File → Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // call s3 helper
    const fileUrl = await uploadFileToS3Bucket({
      buffer,
      originalname: file.name,
      mimetype: file.type,
    });

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      fileUrl,
    });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, message: "Error uploading file, try again." },
      { status: 500 }
    );
  }
}
