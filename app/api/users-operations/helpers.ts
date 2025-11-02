import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import mongoose from "mongoose";

import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import {
  updateInfinityTeam,
  // rebuildInfinity,
  propagateInfinityUpdateToAncestors,
} from "@/services/infinity";

// ------------------ EMAIL ------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const createWelcomeEmailBody = (
  userName: string,
  userId: string,
  contact: string
): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Our Platform</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #222;
          margin: 0;
          padding: 0;
          background-color: #f3f3f3;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #e0e0e0;
          background-color: #ffcc33; /* mustard yellow */
          border-radius: 8px 8px 0 0;
          color: #000; /* black text */
        }
        .header h2 {
          margin: 0;
        }
        .credentials {
          background-color: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .credential-item {
          margin: 10px 0;
          padding: 10px;
          background-color: #fff;
          border-radius: 6px;
          border-left: 4px solid #555; /* dark gray/black accent */
        }
        .footer {
          text-align: center;
          padding: 15px 0;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #777;
        }
        .important {
          color: #ffcc33; /* mustard yellow highlight */
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Welcome to Our Platform!</h2>
        </div>
        
        <p>Hello ${userName},</p>
        <p>Your account has been successfully created. Here are your login credentials:</p>
        
        <div class="credentials">
          <div class="credential-item">
            <strong>User ID:</strong> ${userId}
          </div>
          <div class="credential-item">
            <strong>Contact Number:</strong> ${contact}
          </div>
          <div class="credential-item">
            <strong>Default Password:</strong> ${contact} (your contact number)
          </div>
        </div>
        
        <p><span class="important">Important:</span> You can use either your User ID or Contact Number to login.</p>
        <p>For security reasons, please change your password in the settings section after your first login.</p>
        
        <p>If you have any questions, please contact our support team.</p>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const sendWelcomeEmail = async (
  email: string,
  userName: string,
  userId: string,
  contact: string
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Account Has Been Created",
    html: createWelcomeEmailBody(userName, userId, contact),
  };
  return transporter.sendMail(mailOptions);
};

// ------------------ TREE LOGIC ------------------
async function findAvailablePlacement(
  parentId: string,
  team: "left" | "right" = "right"
) {
  const count = await TreeNode.countDocuments();
  if (count === 0) return { parent: null, side: team };

  const current = await TreeNode.findOne({ user_id: parentId });
  if (!current) throw new Error("Parent not found in tree");

  let node = current;
  let side: "left" | "right" = team;

  while (node[side]) {
    const next = await TreeNode.findOne({ user_id: node[side] });
    if (!next) throw new Error(`Tree structure broken on ${side}`);
    node = next;
  }

  return { parent: node, side };
}

async function createTreeNode(
  user: any,
  parentId?: string, // explicit parent
  referrerId?: string, // fallback for automatic placement
  team: "left" | "right" = "right"
) {
  let parentNode: any = null;
  let side: "left" | "right" = team;

  if (parentId) {
    // Use the explicit parent
    parentNode = await TreeNode.findOne({ user_id: parentId });
    if (!parentNode) throw new Error("Specified parent not found in tree");

    if (parentNode[team]) {
      throw new Error(
        `Parent already has a user on the ${team} side. Choose another side.`
      );
    }
  } else if (referrerId) {
    // No explicit parent → find placement under referBy
    const placement = await findAvailablePlacement(referrerId, team);
    parentNode = placement.parent;
    side = placement.side;
  } else {
    // No parent and no referBy → auto placement
    const placement = await findAvailablePlacement("", team);
    parentNode = placement.parent;
    side = placement.side;
  }

  // Create tree node
  const newNode = await TreeNode.create({
    user_id: user.user_id,
    name: user.user_name,
    status: user.user_status || "inactive",
    contact: user.contact || "",
    mail: user.mail || "",
    address: user.address || "",
    parent: parentNode ? parentNode.user_id : null,
    left: null,
    right: null,
    referrals: [],
    referral_count: 0,
    refer_by: referrerId || null,
  });

  // Update parent's team side
  if (parentNode) {
    await TreeNode.updateOne(
      { user_id: parentNode.user_id },
      { $set: { [side]: user.user_id } }
    );
  }

  // ✅ Update referrals and referral_count in TreeNode for referrerId
  if (referrerId) {
    await TreeNode.updateOne(
      { user_id: referrerId },
      {
        $push: { referrals: user.user_id },
        $inc: { referral_count: 1 },
      }
    );
  }

  return newNode;
}

// ------------------ CREATE USER ------------------
export async function createUserAndLogin(body: any) {
  const {
    mail,
    contact,
    dob,
    user_name,
    first_name,
    last_name,
    role,
    role_id,
    title,
    address,
    pincode,
    locality,
    referBy,
    team,
    parent, // explicit parent
  } = body;

  const existingUser = await User.findOne({ $or: [{ mail }, { contact }] });
  const existingLogin = await Login.findOne({ $or: [{ mail }, { contact }] });
  if (existingUser || existingLogin)
    throw new Error("Email or Contact already exists");

  const user_id = await generateUniqueCustomId("US", User, 8, 8);
  const login_id = await generateUniqueCustomId("LG", Login, 8, 8);

  const newUser = await User.create({
    ...body,
    user_id,
    infinity_users: [],
    referred_users: [],
    paid_directs: [],
  });

  const hashedPassword = await bcrypt.hash(contact, 10);

  const newLogin = await Login.create({
    login_id,
    user_id,
    user_name,
    first_name: first_name || "",
    last_name: last_name || "",
    dob: dob || "",
    role: role || "",
    role_id: role_id || "",
    title: title || "",
    mail,
    contact,
    address: address || "",
    pincode: pincode || "",
    locality: locality || "",
    referBy: referBy || "",
    password: hashedPassword,
    status: "inactive",
  });

  // Tree logic: prefer explicit parent, else referBy
  await createTreeNode(newUser, parent, referBy, team as "left" | "right");

  try {
    await sendWelcomeEmail(mail, user_name, user_id, contact);
  } catch (err) {
    console.error("Email send failed:", err);
    // Optionally, continue without failing registration
  }
  if (referBy) {
    await User.updateOne(
      { user_id: referBy },
      { $push: { referred_users: user_id } }
    );

    try {
      const refNode = await TreeNode.findOne({ user_id: referBy }).lean();
      let sideToUpdate: "left" | "right" = "right";

      if (team === "left" || (refNode && (refNode as any).left === user_id)) {
        sideToUpdate = "left";
      } else if (
        team === "right" ||
        (refNode && (refNode as any).right === user_id)
      ) {
        sideToUpdate = "right";
      }

      if (sideToUpdate === "left") {
        await User.findOneAndUpdate(
          { user_id: referBy },
          {
            $addToSet: { direct_left_users: user_id },
            $inc: { direct_left_count: 1 },
          }
        );
      } else {
        await User.findOneAndUpdate(
          { user_id: referBy },
          {
            $addToSet: { direct_right_users: user_id },
            $inc: { direct_right_count: 1 },
          }
        );
      }
    } catch (err) {
      console.error("Failed to update direct_left/right on referrer:", err);
    }

    // const referrer = await User.findOne({ user_id: referBy });
    // if (!referrer?.infinity_users?.length) {
    //   await rebuildInfinity();
    // } else {
    //   await updateInfinityTeam(referBy);
    //   await propagateInfinityUpdateToAncestors(referBy);
    // }
  }

  return { newUser, newLogin };
}
