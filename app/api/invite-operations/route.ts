// invite-operations/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.NEXT_PUBLIC_REF_KEY || "";

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Create encrypted invite link
function createEncryptedInviteLink(
  referBy: string,
  position: "left" | "right"
) {
  const payload = { referBy, position };
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    SECRET_KEY!
  ).toString();

  return `https://v-life-gules.vercel.app/auth/register?ref=${encodeURIComponent(
    encrypted
  )}`;
}

// Email template
const createInviteEmailBody = (
  inviterName: string,
  inviterId: string,
  link: string,
  position: string
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're Invited</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color:#f9f9f9; margin:0; padding:0;">
      <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);padding:20px;">
        <div style="text-align:center;padding-bottom:15px;border-bottom:1px solid #eee;">
          <h2 style="margin:0;color:#0c3978;">You're Invited 🚀</h2>
        </div>
        <p>Hello,</p>
       <p><strong>${inviterName}</strong> (${inviterId}) has invited you to join <b>Maverick</b>.</p>
        
        <p>You are invited to join Organization: <b>${position}</b>.</p>

                <p>Click below to register securely:</p>

        
        <!-- Styled button -->
        <div style="text-align:center;margin-top:20px;">
          <a href="${link}"
             style="background-color:#facc15; /* yellow-400 */
                    color:#000; 
                    font-weight:600; 
                    padding:10px 24px; 
                    border-radius:8px; 
                    text-decoration:none; 
                    display:inline-block;
                    transition:all 0.2s ease-in-out;">
            Join Now
          </a>
        </div>

        <div style="font-size:12px;text-align:center;color:#777;margin-top:30px;border-top:1px solid #eee;padding-top:15px;">
          <p>This is an automated invite. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export async function POST(req: Request) {
  try {
    const { email, user_id, user_name,position } = await req.json();

    if (!email || !user_id || !user_name|| !position) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase();

    // 🔎 Check if user already exists
    await connectDB();
    const existingUser = await User.findOne({ mail: lowerEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

     // Create secure link
    const link = createEncryptedInviteLink(user_id, position);

    // Build email HTML
    const html = createInviteEmailBody(
      user_name,
      user_id,
      link,
      position === "left" ? "Organization 1" : "Organization 2"
    );

    // Send mail
    await transporter.sendMail({
      from: `"Maverick" <${process.env.EMAIL_USER}>`,
      to: lowerEmail,
      subject: "You’re Invited to Join Maverick!",
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: "Failed to send invite" },
      { status: 500 }
    );
  }
}
