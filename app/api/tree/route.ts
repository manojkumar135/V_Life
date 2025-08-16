import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TreeNode from "@/models/tree"; 
import { buildTree } from "@/lib/tree";
import mongoose from "mongoose";

/**
 * POST /api/tree
 * Create a node that can act as a root (no parent).
 * Body: { user_id: string, name: string }
 */
export async function POST(req: Request) {
  try {
    await connectDB();
    const { user_id, name } = await req.json();

    if (!user_id || !name) {
      return NextResponse.json({ success: false, message: "user_id and name are required" }, { status: 400 });
    }

    const exists = await TreeNode.findOne({ user_id });
    if (exists) {
      return NextResponse.json({ success: false, message: "user_id already exists" }, { status: 409 });
    }

    const node = await TreeNode.create({ user_id, name });
    return NextResponse.json({ success: true, node });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/tree
 * Add a child to a parent on left or right.
 * Body: { parentId?: string, parent_user_id?: string, side: "left" | "right", user_id: string, name: string }
 */
export async function PUT(req: Request) {
  try {
    await connectDB();
    const { parentId, parent_user_id, side, user_id, name } = await req.json();

    if (!side || !["left", "right"].includes(side)) {
      return NextResponse.json({ success: false, message: "side must be 'left' or 'right'" }, { status: 400 });
    }
    if (!user_id || !name) {
      return NextResponse.json({ success: false, message: "child user_id and name are required" }, { status: 400 });
    }

    const existingChild = await TreeNode.findOne({ user_id });
    if (existingChild) {
      return NextResponse.json({ success: false, message: "child user_id already exists" }, { status: 409 });
    }

    let parentDoc = null;
    if (parentId) {
      parentDoc = await TreeNode.findById(parentId);
    } else if (parent_user_id) {
      parentDoc = await TreeNode.findOne({ user_id: parent_user_id });
    }

    if (!parentDoc) {
      return NextResponse.json({ success: false, message: "Parent not found" }, { status: 404 });
    }

    if ((side === "left" && parentDoc.left) || (side === "right" && parentDoc.right)) {
      return NextResponse.json({ success: false, message: `Parent already has a ${side} child` }, { status: 400 });
    }

    const child = await TreeNode.create({
      user_id,
      name,
      parent: parentDoc._id,
    });

    parentDoc.set(side, child._id);
    await parentDoc.save();

    return NextResponse.json({ success: true, parent: parentDoc, child });
  } catch (err: any) {
    // duplicate key safety
    if (err?.code === 11000) {
      return NextResponse.json({ success: false, message: "Duplicate user_id" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * GET /api/tree
 * Query params:
 *   - user_id (preferred) OR id (MongoId)
 *   - depth (number, default 3, max 100)
 *   - side: optional "left" | "right" to start from that branch
 *   - flat: "1" to also return a flat list of {user_id,name}
 *
 * Returns nested tree (and optional flat list) from the given start node/branch.
 */
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    const id = searchParams.get("id");
    const side = searchParams.get("side") as "left" | "right" | null;
    const flat = searchParams.get("flat");
    const depthParam = parseInt(searchParams.get("depth") || "3", 10);
    const maxDepth = Math.max(0, Math.min(100, isNaN(depthParam) ? 3 : depthParam));

    // locate start node
    let start = null;
    if (user_id) start = await TreeNode.findOne({ user_id }).lean();
    else if (id && mongoose.Types.ObjectId.isValid(id)) start = await TreeNode.findById(id).lean();

    if (!start) {
      return NextResponse.json({ success: false, message: "Node not found" }, { status: 404 });
    }

    // pick branch or start at node
    let startId: any;
    if (Array.isArray(start)) {
      if (start.length === 0) {
        return NextResponse.json({ success: false, message: "Node not found" }, { status: 404 });
      }
      startId = start[0]._id;
      start = start[0];
    } else {
      startId = start._id;
    }
    if (side) {
      const branchId = start[side];
      if (!branchId) {
        return NextResponse.json({ success: true, tree: null, flat: [] });
      }
      startId = branchId;
    }

    const tree = await buildTree(startId, 0, maxDepth);

    // flat list (pre-order)
    let flatList: Array<{ user_id: string; name: string }> = [];
    if (flat === "1") {
      const stack: any[] = [];
      if (tree) stack.push(tree);
      while (stack.length) {
        const n = stack.pop();
        flatList.push({ user_id: n.user_id, name: n.name });
        if (n.right) stack.push(n.right);
        if (n.left) stack.push(n.left);
      }
    }

    return NextResponse.json({ success: true, tree, flat: flat === "1" ? flatList : undefined });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
