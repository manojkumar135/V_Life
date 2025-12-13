import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name") || "Member";

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    const WIDTH = 595;
    const HEIGHT = 842;

    /* ---------------- Background ---------------- */
    const bgUrl =
      "https://res.cloudinary.com/dtb4vozhy/image/upload/v1765538939/ChatGPT_Image_Dec_12_2025_04_58_15_PM_ezevkm.png";
    const bgBytes = await fetch(bgUrl).then((r) => r.arrayBuffer());
    const bgImg = await pdfDoc.embedPng(bgBytes);

    page.drawImage(bgImg, {
      x: 0,
      y: 0,
      width: WIDTH,
      height: HEIGHT,
    });

    /* ---------------- Logo ---------------- */
    const logoUrl =
      "https://res.cloudinary.com/dtb4vozhy/image/upload/v1764400245/maverick-logo_sddrui.png";
    const logoBytes = await fetch(logoUrl).then((r) => r.arrayBuffer());
    const logoImg = await pdfDoc.embedPng(logoBytes);

    // ↓ Lowered logo slightly
    page.drawImage(logoImg, {
      x: 235,
      y: 760,
      width: 125,
      height: 55,
    });

    /* ---------------- Fonts ---------------- */
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = 720;

    const write = (
      text: string,
      size = 10,
      gap = 7 // ← controlled spacing
    ) => {
      page.drawText(text, {
        x: 60,
        y,
        size,
        font,
        maxWidth: WIDTH - 120,
        color: rgb(0, 0, 0),
      });
      y -= size + gap;
    };

    /* ---------------- Title ---------------- */
    // ↓ BLACK color + reduced gap from logo
    page.drawText("WELCOME TO MAVERICK", {
      x: 195,
      y: 705,
      size: 16,
      font,
      color: rgb(0, 0, 0), // FIXED (no blue)
    });

    y = 670;

    /* ---------------- Content ---------------- */

    write(`Dear ${name},`, 11, 10);

    write(
      "As an Associate, welcome to the Maverick Family! We at Maverick adhere to the timeless ideas of wellbeing and health. Our goal is to make sure that everyone puts their health first and aspires to achievement, progress, and prosperity. According to the Atharva Veda, success is largely dependent on one’s state of health.",
      10,
      9
    );

    write("");

    write(
      "As an important part of the Maverick family, you will have the chance to grow financially for the rest of your life by endorsing and utilizing our premium health and wellness supplements.",
      10,
      10
    );

    write("Our Commitment to Quality :", 11, 8);
    write(
      "Maverick is well known for manufacturing Health & Wellness Products that are safe, effective, and up to international standards.",
      10,
      8
    );

    write("");
    write("• ISO 9001:2015/HACCP", 10, 6);
    write("• HALAL", 10, 6);
    write("• KOSHER", 10, 6);
    write("• FSSAI", 10, 6);
    write("• 100% Organic Certified Products", 10, 10);

    write("Unique Business Opportunity :", 11, 8);
    write(
      "Maverick offers a rewarding compensation plan that ensures significantly higher returns for our associates.",
      10,
      10
    );

    write("Support and Feedback :", 11, 8);
    write(
      "We assure you that you are in capable hands and encourage you to reach out to Maverick leadership for support anytime.",
      10,
      8
    );

    write(
      "For queries, call 18002965586 or email dcs@maverick.com.",
      10,
      12
    );

    write("Wish You Success!", 10, 6);
    write("Warm Regards!", 10, 6);
    write("MAVERICK MANAGEMENT", 10, 12);

    /* ---------------- Footer ---------------- */
    y = 135;

    page.drawLine({
      start: { x: 60, y },
      end: { x: WIDTH - 60, y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });

    y -= 14;

    write("Maverick Private Limited", 9, 4);
    write(
      "No.3, Bellary Road, Yadavananda Building, 2nd Floor, Opp. To Veterinary College, Bengaluru - 560024",
      9,
      4
    );
    write(
      "Email : info@maverick.com | Toll-Free No : 18002965586",
      9,
      4
    );

    /* ---------------- Export ---------------- */
    const pdfBytes = await pdfDoc.save();

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
    console.error(error);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }
}
