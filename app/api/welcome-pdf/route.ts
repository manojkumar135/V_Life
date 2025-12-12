import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET() {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size portrait

    // Background Image
    const bgUrl =
      "https://res.cloudinary.com/dtb4vozhy/image/upload/v1765538939/ChatGPT_Image_Dec_12_2025_04_58_15_PM_ezevkm.png";
    const bgBytes = await fetch(bgUrl).then((res) => res.arrayBuffer());
    const bgImg = await pdfDoc.embedPng(bgBytes);

    page.drawImage(bgImg, {
      x: 0,
      y: 0,
      width: 595,
      height: 842,
    });

    // Logo
    const logoUrl =
      "https://res.cloudinary.com/dtb4vozhy/image/upload/v1764400245/maverick-logo_sddrui.png";
    const logoBytes = await fetch(logoUrl).then((res) => res.arrayBuffer());
    const logoImg = await pdfDoc.embedPng(logoBytes);

    page.drawImage(logoImg, {
      x: 220,
      y: 730,
      width: 150,
      height: 70,
    });

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = 680;
    const write = (text: string, size = 12) => {
      page.drawText(text, {
        x: 50,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      });
      y -= size + 8;
    };

    page.drawText("WELCOME TO MAVERICK", {
      x: 180,
      y: 700,
      size: 18,
      font,
      color: rgb(0, 0, 0.4),
    });

    write("Dear Member,", 16);

    write(
      "As an Associate, welcome to the Maverick Family! We adhere to the timeless ideas of wellbeing"
    );
    write(
      "and health. Our goal is to make sure that everyone puts their health first and aspires to"
    );
    write(
      "achievement, progress and prosperity. According to the Atharva Veda, success depends on a"
    );
    write("person’s state of health.");
    write("");
    write(
      "As part of the Maverick family, you can grow financially for the rest of your life by endorsing our"
    );
    write("premium health and wellness supplements.");
    write("");

    write("Our Commitment to Quality :", 14);
    write(
      "We manufacture Health & Wellness Products that meet global standards and certifications."
    );
    write("");

    write("Unique Business Opportunity :", 14);
    write(
      "Maverick offers a rewarding compensation plan ensuring higher returns for all associates."
    );
    write("");

    write("Support & Feedback :", 14);
    write("Our leadership team is always available for support and guidance.");
    write("");

    write("Warm Regards,");
    write("MAVERICK MANAGEMENT");

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    // FIX: Convert Uint8Array → ReadableStream (Edge runtime compliant)
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(pdfBytes);
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="welcome-letter.pdf"',
      },
    });

  } catch (error) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }
}
