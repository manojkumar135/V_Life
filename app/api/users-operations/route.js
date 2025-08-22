import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { Login } from "@/models/login";

import mongoose from "mongoose";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";


// POST - Create new user
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

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
      locality 
    } = body;

    // Step 1: Check if mail or contact already exists in User or Login
    const existingUser = await User.findOne({
      $or: [{ mail }, { contact }],
    });

   const existingLogin = await Login.findOne({
  $or: [{ mail }, { contact }],
});

if (existingLogin) {
  let message = "";
  if (existingLogin.mail === mail) {
    message = "Email already exists";
  } else if (existingLogin.contact === contact) {
    message = "Contact already exists";
  } else {
    message = "Email or contact already exists";
  }

  return NextResponse.json(
    { success: false, message },
    { status: 400 }
  );
}

    // Step 2: Generate user_id
    const user_id = await generateUniqueCustomId("US", User, 8, 8);

    // Step 3: Create User
    const newUser = await User.create({ ...body, user_id });

    // Step 4: Generate login_id
    const login_id = await generateUniqueCustomId("LG", Login, 8, 8);

    // Step 5: Hash default password (using contact as default password)
    const hashedPassword = await bcrypt.hash(contact, 10);

    // Step 6: Create Login
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
      password: hashedPassword,
      status: "Active",
    });

    return NextResponse.json(
      { success: true, user: newUser, login: newLogin },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
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
