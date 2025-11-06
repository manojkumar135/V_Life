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

/**
 * Helpers for strict typing of inputs/outputs used by the create flow.
 * Keep shapes minimal — these match the fields used by this module.
 */
export interface ITreeNode {
  _id?: any;
  user_id: string;
  name?: string;
  status?: string;
  parent?: string | null;
  left?: string | null;
  right?: string | null;
  refer_by?: string | null;
  referrals?: string[];
  referral_count?: number;
}

export interface CreateUserInput {
  mail: string;
  contact: string;
  dob?: string;
  user_name: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  role_id?: string;
  title?: string;
  address?: string;
  pincode?: string;
  locality?: string;
  referBy: string; // sponsor (required)
  team: "left" | "right"; // required
  parent?: string | null; // optional explicit parent
  [key: string]: unknown;
}

export interface CreatedResult {
  newUser: Record<string, unknown>;
  newLogin: Record<string, unknown>;
}

// ------------------ EMAIL ------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const createWelcomeEmailBody = (userName: string, userId: string, contact: string): string => {
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
          background-color: #ffcc33;
          border-radius: 8px 8px 0 0;
          color: #000;
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
          border-left: 4px solid #555;
        }
        .footer {
          text-align: center;
          padding: 15px 0;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #777;
        }
        .important {
          color: #ffcc33;
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

export const sendWelcomeEmail = async (email: string, userName: string, userId: string, contact: string) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Account Has Been Created",
    html: createWelcomeEmailBody(userName, userId, contact),
  };
  return transporter.sendMail(mailOptions);
};

/* -------------------------- Tree Utilities --------------------------- */

/**
 * findAvailablePlacement
 * - startUserId: start traversal from sponsor's node
 * - team: 'left' | 'right' - which branch to traverse down
 * Returns { parent: ITreeNode | null, side }
 */
async function findAvailablePlacement(
  startUserId: string,
  team: "left" | "right" = "right"
): Promise<{ parent: ITreeNode | null; side: "left" | "right" }> {
  const total = await TreeNode.countDocuments().exec();
  if (total === 0) {
    // empty tree — new node will be root (parent null)
    return { parent: null, side: team };
  }

  if (!startUserId) {
    throw new Error("startUserId must be provided for placement search on non-empty tree");
  }

  const start = await TreeNode.findOne({ user_id: startUserId }).lean<ITreeNode | null>().exec();
  if (!start) throw new Error("Start user (sponsor) not found in tree");

  let current: ITreeNode = start;
  const side: "left" | "right" = team;

  // traverse down the sponsor's requested side until an empty slot
  // (we follow rule 3: traverse sponsor’s side until empty)
  while ((current as any)[side]) {
    const nextId = (current as any)[side] as string;
    const nextNode = await TreeNode.findOne({ user_id: nextId }).lean<ITreeNode | null>().exec();
    if (!nextNode) {
      // tree inconsistent — stop and return current as parent
      break;
    }
    current = nextNode;
  }

  return { parent: current, side };
}

/**
 * getAncestorChain(nodeId)
 * Returns array [nodeId, parentId, grandParentId, ..., top] (stops when no parent)
 */
async function getAncestorChain(nodeId: string): Promise<string[]> {
  const chain: string[] = [];
  let currentId: string | null = nodeId;
  while (currentId) {
    chain.push(currentId);
    const node = await TreeNode.findOne({ user_id: currentId }).lean<ITreeNode | null>().exec();
    if (!node) break;
    currentId = node.parent ?? null;
  }
  return chain;
}

/**
 * isValidReferrerForPlacement (strict)
 * - Returns true iff:
 *   - referrerId === parentId (direct parent) OR
 *   - referrerId is an ancestor of parentId AND every step from referrer -> ... -> parent
 *     follows the same side as the requested 'side'.
 *
 * This enforces your rule: sponsor may add down their chain only on the same side path.
 */
async function isValidReferrerForPlacement(
  referrerId: string,
  parentId: string,
  side: "left" | "right"
): Promise<boolean> {
  if (!referrerId || !parentId) return false;
  if (referrerId === parentId) return true; // sponsor is direct parent -> allowed

  // Build ancestors chain for parent
  const ancestors = await getAncestorChain(parentId); // [parent, parent.parent, ...]
  if (!ancestors.includes(referrerId)) return false; // sponsor must be ancestor

  // Reverse to go from root -> ... -> parent
  const reversed = ancestors.slice().reverse();
  const startIdx = reversed.indexOf(referrerId);
  if (startIdx === -1) return false;

  const path = reversed.slice(startIdx); // [referrerId, ..., parentId]
  // Validate each hop follows same side as requested
  for (let i = 0; i < path.length - 1; i++) {
    const ancId = path[i];
    const childId = path[i + 1];
    const ancNode = await TreeNode.findOne({ user_id: ancId }).lean<ITreeNode | null>().exec();
    if (!ancNode) return false;
    const wentLeft = ancNode.left === childId;
    const wentRight = ancNode.right === childId;
    if (!wentLeft && !wentRight) return false; // broken link
    if (wentLeft && side !== "left") return false;
    if (wentRight && side !== "right") return false;
  }

  return true;
}

/* ------------------------- Create Tree Node ------------------------- */

/**
 * createTreeNode
 * - explicitParentId provided => validate it exists, side free, and referrer is allowed (strict check)
 * - explicitParentId not provided => use referrerId to find placement by traversing down `team`
 *
 * Returns created tree node object (lean shape).
 */
async function createTreeNode(
  userRecord: Record<string, unknown>,
  explicitParentId: string | undefined | null,
  referrerId: string | undefined | null,
  team: "left" | "right" = "right"
): Promise<ITreeNode> {
  // Validate inputs
  if (!userRecord || typeof userRecord.user_id !== "string") {
    throw new Error("Invalid user record provided to createTreeNode");
  }

  let parentNode: ITreeNode | null = null;
  let side: "left" | "right" = team;

  if (explicitParentId) {
    // Parent must exist
    parentNode = await TreeNode.findOne({ user_id: explicitParentId }).lean<ITreeNode | null>().exec();
    if (!parentNode) {
      throw new Error("Specified parent not found in tree");
    }

    // Selected side must be free
    if ((parentNode as any)[team]) {
      throw new Error(`Parent already has a user on the ${team} side. Choose another side or a different parent.`);
    }

    // referrer must be provided
    if (!referrerId) {
      throw new Error("referBy (sponsor) must be provided when explicit parent is specified");
    }

    // sponsor must be ancestor AND path side must match (or be direct parent)
    const valid = await isValidReferrerForPlacement(referrerId, explicitParentId, team);
    if (!valid) {
      throw new Error("Invalid placement: the provided sponsor (referBy) is not permitted to add at this parent/side.");
    }
  } else {
    // No explicit parent given => traverse referrer's chain on `team`
    if (!referrerId) {
      // if tree empty, allow root creation only when referrerId not provided and tree empty
      const count = await TreeNode.countDocuments().exec();
      if (count > 0) throw new Error("referBy (sponsor) must be provided when parent is not specified");
      parentNode = null;
      side = team;
    } else {
      // find available placement under sponsor
      const placement = await findAvailablePlacement(referrerId, team);
      parentNode = placement.parent;
      side = placement.side;
      // before returning, ensure parentNode is allowed for sponsor (should be by traversal)
      if (parentNode && !(await isValidReferrerForPlacement(referrerId, parentNode.user_id, side))) {
        throw new Error("Invalid automatic placement: sponsor cannot place at the discovered parent/side");
      }
    }
  }

  // At this point parentNode (may be null if root) and side selected
  const createdDoc = await TreeNode.create({
    user_id: userRecord.user_id as string,
    name: (userRecord.user_name as string) || "",
    status: (userRecord.user_status as string) || "inactive",
    contact: (userRecord.contact as string) || "",
    mail: (userRecord.mail as string) || "",
    address: (userRecord.address as string) || "",
    parent: parentNode ? parentNode.user_id : null,
    left: null,
    right: null,
    referrals: [],
    referral_count: 0,
    refer_by: referrerId ?? null,
  });

  const createdObj = createdDoc.toObject ? (createdDoc.toObject() as ITreeNode) : (createdDoc as unknown as ITreeNode);

  // Update parent pointer atomically: ensure side still free (race-safe attempt)
  if (parentNode) {
    const update = await TreeNode.findOneAndUpdate(
      { user_id: parentNode.user_id, [side]: { $in: [null, "", undefined] } },
      { $set: { [side]: userRecord.user_id } },
      { new: true }
    ).lean().exec();

    if (!update) {
      // rollback created node to avoid orphan (best-effort) and surface clear error
      try {
        await TreeNode.deleteOne({ user_id: userRecord.user_id }).exec();
      } catch {
        // ignore
      }
      throw new Error("Failed to attach new node to parent (slot was taken concurrently). Try again.");
    }
  }

  // Update sponsor's referrals list and count (non-blocking)
  if (referrerId) {
    try {
      await TreeNode.updateOne(
        { user_id: referrerId },
        { $addToSet: { referrals: userRecord.user_id }, $inc: { referral_count: 1 } }
      ).exec();
    } catch {
      // ignore minor failure here
    }
  }

  return createdObj;
}

/* ------------------------ Create User & Login ----------------------- */

/**
 * createUserAndLogin
 * - Validates inputs
 * - Creates User + Login records
 * - Inserts TreeNode after validation (strict placement rules)
 * - Sends welcome email (best-effort)
 * - Updates referrer User's referred_users and direct left/right counts
 */
export async function createUserAndLogin(body: CreateUserInput): Promise<CreatedResult> {
  // Basic validation
  if (!body) throw new Error("Request body required");
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
    parent, // explicit parent id
  } = body;

  if (typeof mail !== "string" || !mail) throw new Error("mail is required");
  if (typeof contact !== "string" || !contact) throw new Error("contact is required");
  if (typeof user_name !== "string" || !user_name) throw new Error("user_name is required");
  if (typeof referBy !== "string" || !referBy) throw new Error("referBy (sponsor) must be provided");
  if (team !== "left" && team !== "right") throw new Error("team must be 'left' or 'right'");

  // ensure referBy exists
  const referrerExists = await User.findOne({ user_id: referBy }).lean().exec();
  if (!referrerExists) throw new Error("referBy (sponsor) not found");

  // if parent provided ensure exists
  if (parent) {
    const parentExists = await TreeNode.findOne({ user_id: parent }).lean().exec();
    if (!parentExists) throw new Error("Specified parent not found in tree");
  }

  // duplicates
  const existingUser = await User.findOne({ $or: [{ mail }, { contact }] }).lean().exec();
  const existingLogin = await Login.findOne({ $or: [{ mail }, { contact }] }).lean().exec();
  if (existingUser || existingLogin) throw new Error("Email or Contact already exists");

  // generate IDs
  const user_id = await generateUniqueCustomId("US", User, 8, 8);
  const login_id = await generateUniqueCustomId("LG", Login, 8, 8);

  // create user doc
  const newUserDoc = await User.create({
    ...body,
    user_id,
    infinity_users: [],
    referred_users: [],
    paid_directs: [],
  });

  // hash default password (contact)
  const hashedPassword = await bcrypt.hash(contact, 10);

  // create login doc
  const newLoginDoc = await Login.create({
    login_id,
    user_id,
    user_name,
    first_name: first_name ?? "",
    last_name: last_name ?? "",
    dob: dob ?? "",
    role: role ?? "",
    role_id: role_id ?? "",
    title: title ?? "",
    mail,
    contact,
    address: address ?? "",
    pincode: pincode ?? "",
    locality: locality ?? "",
    referBy: referBy ?? "",
    password: hashedPassword,
    status: "inactive",
  });

  // create tree node with strict checks
  await createTreeNode(newUserDoc.toObject ? newUserDoc.toObject() : (newUserDoc as unknown as Record<string, unknown>), parent ?? undefined, referBy, team);

  // best-effort: send welcome email (do not fail creation if email fails)
  try {
    await sendWelcomeEmail(mail, user_name, user_id, contact);
  } catch (err) {
    // log and continue
    // eslint-disable-next-line no-console
    console.error("Email send failed:", err);
  }

  // update referrer's user doc: referred_users
  await User.updateOne({ user_id: referBy }, { $addToSet: { referred_users: user_id } }).exec();

  // update direct_left/right counters on referrer
  try {
    const refNode = await TreeNode.findOne({ user_id: referBy }).lean<ITreeNode | null>().exec();
    // determine side of the new user relative to referrer:
    // If referrer is direct parent after the tree insert, one of refNode.left/right equals user_id.
    let sideToUpdate: "left" | "right" = team;
    if (refNode) {
      if (refNode.left === user_id) sideToUpdate = "left";
      else if (refNode.right === user_id) sideToUpdate = "right";
      else sideToUpdate = team;
    }

    if (sideToUpdate === "left") {
      await User.updateOne({ user_id: referBy }, { $addToSet: { direct_left_users: user_id }, $inc: { direct_left_count: 1 } }).exec();
    } else {
      await User.updateOne({ user_id: referBy }, { $addToSet: { direct_right_users: user_id }, $inc: { direct_right_count: 1 } }).exec();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to update direct_left/right on referrer:", err);
  }

  // Optional: update infinity team and propagate (kept as best-effort)
  try {
    // await updateInfinityTeam(referBy);
    // await propagateInfinityUpdateToAncestors(referBy);
  } catch {
    // ignore
  }

  return {
    newUser: (newUserDoc.toObject ? newUserDoc.toObject() : (newUserDoc as unknown as Record<string, unknown>)),
    newLogin: (newLoginDoc.toObject ? newLoginDoc.toObject() : (newLoginDoc as unknown as Record<string, unknown>)),
  };
}

export default {
  createUserAndLogin,
  createTreeNode,
  findAvailablePlacement,
  isValidReferrerForPlacement,
  getAncestorChain,
  sendWelcomeEmail,
};