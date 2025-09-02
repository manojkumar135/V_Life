import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import nodemailer from 'nodemailer';

import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";

import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";


// Create transporter directly in the file
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Create welcome email function directly in this file
const createWelcomeEmailBody = (userName, userId, contact) => {
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
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
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
          border-bottom: 1px solid #eee;
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
          border-left: 4px solid #4CAF50;
        }
        .footer {
          text-align: center;
          padding: 20px 0;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #777;
        }
        .important {
          color: #ff5722;
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

// Send welcome email function directly in this file
const sendWelcomeEmail = async (email, userName, userId, contact) => {
  try {
    // Create HTML email body
    const htmlBody = createWelcomeEmailBody(userName, userId, contact);

    // Configure mail options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Account Has Been Created",
      html: htmlBody,
    };

    // Send email
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw new Error("Failed to send welcome email");
  }
};



// ------------------ TREE LOGIC ------------------
// Find available placement in tree
async function findAvailablePlacement(parentId, team) {
  // ✅ If no nodes exist yet → root user
  const count = await TreeNode.countDocuments();
  if (count === 0) {
    return { parent: null, side: null }; // root placement
  }

  // ✅ Normal case → check parent
  let current = await TreeNode.findOne({ user_id: parentId });
  if (!current) throw new Error("Parent not found in tree");

  let side = team || "right"; // default right

  // Traverse until we find an empty slot
  while (current[side]) {
    current = await TreeNode.findOne({ user_id: current[side] });
    if (!current) throw new Error(`Tree structure broken for ${side} side`);
  }

  return { parent: current, side };
}

// ------------------ TREE NODE CREATION ------------------
async function createTreeNode(user, referrerId, team) {
  const { parent, side } = await findAvailablePlacement(referrerId, team);

  // ✅ Case 1: Root node (no parent)
  if (!parent) {
    const newNode = await TreeNode.create({
      user_id: user.user_id,
      name: user.user_name,
      status: user.user_status || "active",
      contact: user.contact || "",
      mail: user.mail || "",
      address: user.address || "",
      pincode: user.pincode || "",
      country: user.country || "",
      state: user.state || "",
      district: user.district || "",
      locality: user.locality || "",
      parent: null,
      left: null,
      right: null,
      referrals: [],
      referral_count: 0,
    });
    return newNode;
  }

  // ✅ Case 2: Normal child node
  const newNode = await TreeNode.create({
    user_id: user.user_id,
    name: user.user_name,
    status: user.user_status || "active",
    contact: user.contact || "",
    mail: user.mail || "",
    address: user.address || "",
    pincode: user.pincode || "",
    country: user.country || "",
    state: user.state || "",
    district: user.district || "",
    locality: user.locality || "",
    parent: parent.user_id,
    left: null,
    right: null,
    referrals: [],
    referral_count: 0,
  });

  // ✅ Always attach the new node under parent (binary placement)
  await TreeNode.updateOne(
    { user_id: parent.user_id },
    { $set: { [side]: user.user_id } }
  );

  // ✅ Only update referrals list if this parent is the actual referrer
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

// ------------------ USER + LOGIN CREATION ------------------

async function createUserAndLogin(body) {
  const {
    mail,
    contact,
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
  } = body;

  // ✅ Check duplicates
  const existingUser = await User.findOne({ $or: [{ mail }, { contact }] });
  const existingLogin = await Login.findOne({ $or: [{ mail }, { contact }] });
  if (existingUser || existingLogin) {
    throw new Error("Email or Contact already exists");
  }

  // ✅ Validate referral
  let referrer = null;
  if (referBy) {
    referrer = await User.findOne({ user_id: referBy });
    if (!referrer) throw new Error("Referral ID does not exist");
  }

  // ✅ Generate IDs
  const user_id = await generateUniqueCustomId("US", User, 8, 8);
  const login_id = await generateUniqueCustomId("LG", Login, 8, 8);

  // ✅ Create User
  const newUser = await User.create({ ...body, user_id });

  // ✅ Update referrer’s referred_users + tree.referrals
  if (referrer) {
    await User.updateOne(
      { user_id: referBy },
      { $push: { referred_users: user_id } }
    );

  }

  // ✅ Create Login (default password = contact)
  const hashedPassword = await bcrypt.hash(contact, 10);
  const newLogin = await Login.create({
    login_id,
    user_id,
    user_name,
    first_name,
    last_name,
    role,
    role_id,
    title,
    mail,
    contact,
    address,
    pincode,
    locality,
    referBy,
    password: hashedPassword,
    status: "Active",
  });

  // ✅ Create TreeNode
  if (referBy) {
    await createTreeNode(newUser, referBy, team);
  } else {
    // root user in tree
    await TreeNode.create({
      user_id,
      name: user_name,
      parent: null,
      left: null,
      right: null,
      referrals: [],
      referral_count: 0,
    });
  }

  // ✅ Send welcome email
  await sendWelcomeEmail(mail, user_name, user_id, contact);

  return { newUser, newLogin };
}


// ------------------ ROUTES ------------------
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const { newUser, newLogin } = await createUserAndLogin(body);

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        user: newUser,
        login: newLogin,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating user:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


// GET - Fetch all users OR single user by id / user_id
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || searchParams.get("user_id");

    if (id) {
      let user;
      if (mongoose.Types.ObjectId.isValid(id)) {
        user = await User.findById(id);
      } else {
        user = await User.findOne({ user_id: id });
      }

      if (!user) {
        return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: user }, { status: 200 });
    }

    const users = await User.find();
    return NextResponse.json({ success: true, data: users }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT - Replace a user (full update)
export async function PUT(request) {
  try {
    await connectDB();
    const { id, user_id, ...rest } = await request.json();
    const updateId = id || user_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }

    // 🔎 Check if contact or mail already exists for another user
    if (rest.contact || rest.mail) {
      const existingUser = await User.findOne({
        $or: [
          rest.contact ? { contact: rest.contact } : null,
          rest.mail ? { mail: rest.mail } : null,
        ].filter(Boolean),
        ...(mongoose.Types.ObjectId.isValid(updateId)
          ? { _id: { $ne: updateId } }
          : { user_id: { $ne: updateId } }),
      });

      if (existingUser) {
        if (existingUser.contact === rest.contact) {
          return NextResponse.json(
            { success: false, message: "Contact already exists" },
            { status: 400 }
          );
        }
        if (existingUser.mail === rest.mail) {
          return NextResponse.json(
            { success: false, message: "Email already exists" },
            { status: 400 }
          );
        }
      }
    }

    // 🔄 Update User
    let updatedUser;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedUser = await User.findByIdAndUpdate(updateId, rest, { new: true });
    } else {
      updatedUser = await User.findOneAndUpdate({ user_id: updateId }, rest, {
        new: true,
      });
    }

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // 🔄 Sync Login record with **all relevant fields**
    await Login.findOneAndUpdate(
      { user_id: updatedUser.user_id },
      {
        ...(rest.user_name && { user_name: rest.user_name }),
        ...(rest.role && { role: rest.role }),
        ...(rest.mail && { mail: rest.mail }),
        ...(rest.password && { password: rest.password }), // ⚠️ assume already hashed
        ...(rest.contact && { contact: rest.contact }),
        ...(rest.status && { status: rest.status }),
        ...(rest.isDeleted !== undefined && { isDeleted: rest.isDeleted }),
        ...(rest.login_time && { login_time: rest.login_time }),
        ...(rest.address && { address: rest.address }),
        ...(rest.locality && { locality: rest.locality }),
        ...(rest.pincode && { pincode: rest.pincode }),
        ...(rest.intro !== undefined && { intro: rest.intro }),
        ...(rest.created_at && { created_at: rest.created_at }),
      },
      { new: true }
    );

    return NextResponse.json(
      { success: true, data: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Partial update
export async function PATCH(request) {
  try {
    await connectDB();
    const { id, user_id, ...updates } = await request.json();
    const updateId = id || user_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }

    // 🔎 Check duplicates before updating (only if user updates email/phone)
    if (updates.phone || updates.email) {
      const duplicate = await Login.findOne({
        $or: [
          updates.phone ? { contact: updates.phone } : {},
          updates.email ? { mail: updates.email } : {},
        ],
        user_id: { $ne: updateId }, // exclude current user
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message:
              duplicate.contact === updates.phone
                ? "Contact already exists"
                : "Email already exists",
          },
          { status: 400 }
        );
      }
    }

    // ✅ Update User
    let updatedUser;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedUser = await User.findByIdAndUpdate(updateId, updates, { new: true });
    } else {
      updatedUser = await User.findOneAndUpdate(
        { user_id: updateId },
        updates,
        { new: true }
      );
    }

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // 🔑 Update Login record
    const loginUpdates = {};
    if (updates.userName) loginUpdates.user_name = updates.userName;
    if (updates.phone) loginUpdates.contact = updates.phone;
    if (updates.email) loginUpdates.mail = updates.email;
    if (updates.address) loginUpdates.address = updates.address;
    if (updates.pincode) loginUpdates.pincode = updates.pincode;
    if (updates.locality) loginUpdates.locality = updates.locality;
    if (updates.country) loginUpdates.country = updates.country;
    if (updates.state) loginUpdates.state = updates.state;
    if (updates.profile) loginUpdates.profile = updates.profile;

    if (updates.city || updates.district) {
      loginUpdates.district = updates.city || updates.district;
    }

    let updatedLogin = null;
    if (Object.keys(loginUpdates).length > 0) {
      updatedLogin = await Login.findOneAndUpdate(
        { user_id: updateId },
        loginUpdates,
        { new: true }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully",
        data: { user: updatedUser, login: updatedLogin },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}


// DELETE - Remove a user
export async function DELETE(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const user_id = searchParams.get("user_id");

    let deletedUser;
    if (mongoose.Types.ObjectId.isValid(id || user_id)) {
      deletedUser = await User.findByIdAndDelete(id || user_id);
    } else {
      deletedUser = await User.findOneAndDelete({ user_id });
    }

    if (!deletedUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
