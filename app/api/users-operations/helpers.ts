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


// ------------------ VALIDATION HELPERS ------------------

/**
 * Return the chain of user_ids obtained by repeatedly following `direction`
 * starting from the *child* of startUserId.
 *
 * For example, getDirectionalChainFromNode(A, "left") returns [A.left, (A.left).left, ...]
 */
async function getDirectionalChainFromNode(
  startUserId: string,
  direction: "left" | "right",
  startByChild = true
): Promise<string[]> {
  const result: string[] = [];
  const startNode: any = await TreeNode.findOne({ user_id: startUserId }).lean();
  if (!startNode) return result;

  // nextId starts with the immediate child if startByChild
  let nextId = startByChild ? startNode[direction] : startNode.user_id;
  while (nextId) {
    result.push(nextId);
    const nextNode: any = await TreeNode.findOne({ user_id: nextId }).lean();
    if (!nextNode) break;
    nextId = nextNode[direction];
  }
  return result;
}

/**
 * Compute allowed nodes for a sponsor:
 * - sponsor itself
 * - sponsor's extreme-left chain (sponsor.left, sponsor.left.left, ...)
 * - sponsor's extreme-right chain (sponsor.right, sponsor.right.right, ...)
 *
 * NOTE: we intentionally do NOT include siblings, cross-branch children or internal nodes
 * that are not on either extreme chain.
 */
async function computeAllowedNodesForSponsor(sponsorId: string): Promise<Set<string>> {
  const allowed = new Set<string>();
  const sponsorNode: any = await TreeNode.findOne({ user_id: sponsorId }).lean();
  if (!sponsorNode) return allowed;

  allowed.add(sponsorId);

  const extremeLeft = await getDirectionalChainFromNode(sponsorId, "left", true);
  const extremeRight = await getDirectionalChainFromNode(sponsorId, "right", true);

  extremeLeft.forEach((id) => allowed.add(id));
  extremeRight.forEach((id) => allowed.add(id));

  return allowed;
}

/**
 * Validate that the intended placement (either explicit parentId or the computed
 * automatic placement under sponsor) is within sponsor's allowed extreme-left/right nodes.
 *
 * Behavior:
 * - If sponsorId not found -> throw
 * - If parentId provided: ensure that parent exists and side is free and parent is allowed by sponsor
 * - If parentId NOT provided: compute automatic placement using findAvailablePlacement(sponsorId, team)
 *   and ensure that computed parent is inside allowed nodes.
 */
async function validateSponsorPlacement(
  sponsorId: string,
  parentId: string | undefined,
  team: "left" | "right",
) {
  const sponsorNode = await TreeNode.findOne({ user_id: sponsorId }).lean();
  if (!sponsorNode) throw new Error("Sponsor not found in tree");

  const allowed = await computeAllowedNodesForSponsor(sponsorId);

  if (parentId) {
    const parentNode: any = await TreeNode.findOne({ user_id: parentId }).lean();
    if (!parentNode) throw new Error("Selected parent (explicit) not found");

    if (parentNode[team]) {
      throw new Error(`Selected parent already has a user on ${team} side`);
    }

    if (!allowed.has(parentId)) {
      throw new Error("Selected Referral ID is outside sponsor's allowed extreme-left/right scope");
    }

    // All checks passed for explicit parent
    return;
  }

  // No explicit parent => compute automatic placement under sponsor
  const placement = await findAvailablePlacement(sponsorId, team);
  // placement.parent may be null (tree empty) - in that case allowed should contain null? treat empty tree as allowed
  if (!placement.parent) {
    // empty tree case: allowed by default (no parent to validate)
    return;
  }

  const computedParentId = placement.parent.user_id;
  if (!computedParentId) {
    throw new Error("Automatic placement failed to determine a parent");
  }

  // If computed parent slot is already filled, findAvailablePlacement would have walked to the extreme available.
  // Ensure computed parent is within sponsor's allowed nodes
  if (!allowed.has(computedParentId)) {
    throw new Error("Automatic placement under sponsor would fall outside sponsor's allowed scope");
  }

  return;
}

// ------------------ TREE LOGIC ------------------

/**
 * Find the place under `parentId` by walking down `team` to the extreme empty spot.
 * If parentId is falsy: find the root node (parent: null) and start from there.
 * If tree is empty -> returns { parent: null, side: team } meaning root insertion.
 */
async function findAvailablePlacement(
  parentId: string | undefined | null,
  team: "left" | "right" = "right"
) {
  const count = await TreeNode.countDocuments();
  if (count === 0) return { parent: null, side: team };

  // start node
  let current: any;
  if (!parentId) {
    // find root (node with parent: null). If you have multiple roots this finds the first.
    current = await TreeNode.findOne({ parent: null });
    if (!current) {
      // fallback: take any node
      current = await TreeNode.findOne({});
      if (!current) throw new Error("No nodes present to find placement under");
    }
  } else {
    current = await TreeNode.findOne({ user_id: parentId });
    if (!current) throw new Error("Parent not found in tree");
  }

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
  referrerId?: string, // sponsor/referrer for fallback auto placement
  team: "left" | "right" = "right"
) {
  let parentNode: any = null;
  let side: "left" | "right" = team;

  if (parentId) {
    // Use the explicit parent provided by frontend
    parentNode = await TreeNode.findOne({ user_id: parentId });
    if (!parentNode) throw new Error("Specified parent not found in tree");

    if (parentNode[team]) {
      throw new Error(`Parent already has a user on the ${team} side. Choose another side.`);
    }
  } else if (referrerId) {
    // No explicit parent → find placement under referBy (sponsor)
    const placement = await findAvailablePlacement(referrerId, team);
    parentNode = placement.parent; // may be null if tree empty
    side = placement.side;
  } else {
    // No parent and no referBy → auto placement starting from root
    const placement = await findAvailablePlacement(undefined, team);
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
    parent, // explicit parent (provided by frontend)
  } = body;

  // 1) Basic uniqueness checks
  const existingUser = await User.findOne({ $or: [{ mail }, { contact }] });
  const existingLogin = await Login.findOne({ $or: [{ mail }, { contact }] });
  if (existingUser || existingLogin) throw new Error("Email or Contact already exists");

  // 2) If referBy is provided, enforce that team is present (left/right) and validate placement BEFORE creating records
  if (referBy) {
    if (!team || (team !== "left" && team !== "right")) {
      throw new Error("Team side (left or right) is required when referBy is provided.");
    }
    // Validate: either explicit parent (if provided) or automatic computed parent under sponsor must be in allowed set
    await validateSponsorPlacement(referBy, parent, team as "left" | "right");
  }

  // Note: If referBy not provided, we allow parent to be provided or omitted.
  // If parent provided without referBy, we should validate parent existence & slot availability
  if (!referBy && parent) {
    const parentNode = await TreeNode.findOne({ user_id: parent }).lean();
    if (!parentNode) throw new Error("Specified parent not found in tree");
    const chosenTeam = (team && (team === "left" || team === "right")) ? team : "right";
   if ((parentNode as any)[chosenTeam]) {
  throw new Error(`Parent already has a user on ${chosenTeam} side`);
}

  }

  // 3) Generate IDs and create User + Login (only after validation passed)
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
  await createTreeNode(newUser, parent, referBy, (team as "left" | "right") || "right");

  try {
    await sendWelcomeEmail(mail, user_name, user_id, contact);
  } catch (err) {
    console.error("Email send failed:", err);
    // don't fail registration on email error
  }

  if (referBy) {
    // update User.referred_users and direct left/right counters
    await User.updateOne(
      { user_id: referBy },
      { $addToSet: { referred_users: user_id } }
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

    // update infinity structures if required
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