import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Reward } from "@/models/rewards";
import mongoose from "mongoose";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";

// ✅ POST - Create a new reward
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    // Generate unique reward_id with prefix "RW"
    const reward_id = await generateUniqueCustomId("RW", Reward, 8, 8);

    const newReward = await Reward.create({ ...body, reward_id });

    return NextResponse.json({ success: true, data: newReward }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create reward" },
      { status: 500 }
    );
  }
}

// ✅ GET - Fetch all rewards or single reward by id / reward_id
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id") || searchParams.get("reward_id");
    const search = searchParams.get("search");

    // 🔹 Single reward fetch
    if (id) {
      let reward;
      if (mongoose.Types.ObjectId.isValid(id)) {
        reward = await Reward.findById(id);
      } else {
        reward = await Reward.findOne({ reward_id: id });
      }

      if (!reward) {
        return NextResponse.json(
          { success: false, message: "Reward not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: reward }, { status: 200 });
    }

    // 🔹 Filter rewards by search term
    const query: any = {};
    if (search) {
      const searchTerms = search
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      query.$or = searchTerms.flatMap((term) => {
        const regex = new RegExp(term, "i");
        return [
          { reward_id: regex },
          { title: regex },
          { description: regex },
        ];
      });
    }

    const rewards = await Reward.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: rewards }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch rewards" },
      { status: 500 }
    );
  }
}

// ✅ PUT - Full update of reward
export async function PUT(request: Request) {
  try {
    await connectDB();
    const { id, reward_id, ...rest } = await request.json();
    const updateId = id || reward_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID or reward_id is required" },
        { status: 400 }
      );
    }

    let updatedReward;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedReward = await Reward.findByIdAndUpdate(updateId, rest, { new: true });
    } else {
      updatedReward = await Reward.findOneAndUpdate({ reward_id: updateId }, rest, { new: true });
    }

    if (!updatedReward) {
      return NextResponse.json(
        { success: false, message: "Reward not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedReward }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update reward" },
      { status: 500 }
    );
  }
}

// ✅ PATCH - Partial update
export async function PATCH(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, reward_id, ...rest } = body;

    const { searchParams } = new URL(request.url);
    const queryRewardId = searchParams.get("reward_id");

    const updateId = id || reward_id || queryRewardId;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "id or reward_id is required" },
        { status: 400 }
      );
    }

    let updatedReward;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedReward = await Reward.findByIdAndUpdate(updateId, rest, { new: true });
    } else {
      updatedReward = await Reward.findOneAndUpdate({ reward_id: updateId }, rest, { new: true });
    }

    if (!updatedReward) {
      return NextResponse.json(
        { success: false, message: "Reward not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedReward });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to patch reward" },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Delete reward
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const reward_id = searchParams.get("reward_id");

    const targetId = id ?? reward_id;
    let deletedReward;

    if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
      deletedReward = await Reward.findByIdAndDelete(targetId);
    } else if (reward_id) {
      deletedReward = await Reward.findOneAndDelete({ reward_id });
    } else {
      return NextResponse.json(
        { success: false, message: "Reward ID is required" },
        { status: 400 }
      );
    }

    if (!deletedReward) {
      return NextResponse.json(
        { success: false, message: "Reward not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Reward deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete reward" },
      { status: 500 }
    );
  }
}
