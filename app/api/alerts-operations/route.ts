import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import { Alert } from "@/models/alert";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";

// ✅ POST — Create new alert
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    // Generate unique alert_id with prefix "AL"
    const alert_id = await generateUniqueCustomId("AL", Alert, 8, 8);

    // Format date as DD-MM-YYYY
    const date = new Date()
      .toISOString()
      .split("T")[0]
      .split("-")
      .reverse()
      .join("-");

    const newAlert = await Alert.create({
      ...body,
      //   alert_id,
      date,
    });

    return NextResponse.json(
      { success: true, data: newAlert },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST Alert Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create alert" },
      { status: 500 }
    );
  }
}

// ✅ GET — Fetch all or single alert (by id / alert_id / user_id)
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const alert_id = searchParams.get("alert_id");
    const user_id = searchParams.get("user_id");
    const role = searchParams.get("role");
    const priority = searchParams.get("priority");
    const read = searchParams.get("read");
    const archived = searchParams.get("archived");
    const deleted = searchParams.get("deleted");
    const search = searchParams.get("search");

    // 🔹 Single alert fetch
    if (id || alert_id) {
      const lookupId = id || alert_id;
      let alert;

      if (lookupId && mongoose.Types.ObjectId.isValid(lookupId)) {
        alert = await Alert.findById(lookupId);
      } else {
        alert = await Alert.findOne({ alert_id: lookupId });
      }

      if (!alert) {
        return NextResponse.json(
          { success: false, message: "Alert not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: alert }, { status: 200 });
    }

    // 🔹 Build filter query
    let query: any = {};

    // ✅ Handle admin logic (OR condition)
    if (role === "admin" && user_id) {
      query = {
        $or: [{ role: "admin", priority: "high" }, { user_id: user_id }],
      };
    }
    // ✅ Handle user logic
    else if (role === "user" && user_id) {
      query = { role: "user", user_id };
    }

    // ✅ Additional filters (applied to both cases)
    if (read) query.read = read === "true";
    if (archived) query.archived = archived === "true";
    if (deleted) query.deleted = deleted === "true";

    // ✅ Search filter
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        ...(query.$or || []),
        { title: regex },
        { description: regex },
        { user_id: regex },
        { alert_id: regex },
      ];
    }

    // ✅ Fetch alerts (latest first)
    const alerts = await Alert.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: alerts }, { status: 200 });
  } catch (error: any) {
    console.error("GET Alert Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

// ✅ PUT — Full update (replace fields)
export async function PUT(request: Request) {
  try {
    await connectDB();
    const { id, alert_id, ...rest } = await request.json();
    const updateId = id || alert_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID or alert_id is required" },
        { status: 400 }
      );
    }

    let updatedAlert;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedAlert = await Alert.findByIdAndUpdate(updateId, rest, {
        new: true,
      });
    } else {
      updatedAlert = await Alert.findOneAndUpdate(
        { alert_id: updateId },
        rest,
        { new: true }
      );
    }

    if (!updatedAlert) {
      return NextResponse.json(
        { success: false, message: "Alert not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: updatedAlert },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("PUT Alert Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update alert" },
      { status: 500 }
    );
  }
}

// ✅ PATCH — Partial update (read, archived, deleted, etc.)
export async function PATCH(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, alert_id, ids, ...rest } = body; // 👈 include ids array

    const { searchParams } = new URL(request.url);
    const queryAlertId = searchParams.get("alert_id");
    const updateId = id || alert_id || queryAlertId;

    // 🔹 Case 1: multiple alerts (batch update)
    if (Array.isArray(ids) && ids.length > 0) {
      const result = await Alert.updateMany(
        { _id: { $in: ids } },
        { $set: rest }
      );

      return NextResponse.json({
        success: true,
        message: `${result.modifiedCount} alerts updated`,
      });
    }

    // 🔹 Case 2: single alert
    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "id or alert_id is required" },
        { status: 400 }
      );
    }

    let updatedAlert;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedAlert = await Alert.findByIdAndUpdate(updateId, rest, {
        new: true,
      });
    } else {
      updatedAlert = await Alert.findOneAndUpdate(
        { alert_id: updateId },
        rest,
        { new: true }
      );
    }

    if (!updatedAlert) {
      return NextResponse.json(
        { success: false, message: "Alert not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedAlert });
  } catch (error: any) {
    console.error("PATCH Alert Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to patch alert" },
      { status: 500 }
    );
  }
}


// ✅ DELETE — Delete alert by id or alert_id
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const alert_id = searchParams.get("alert_id");

    const targetId = id ?? alert_id;
    console.log(targetId)
    let deletedAlert;

    if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
      deletedAlert = await Alert.findByIdAndDelete(targetId);
    } else if (alert_id) {
      deletedAlert = await Alert.findOneAndDelete({ alert_id });
    } else {
      return NextResponse.json(
        { success: false, message: "Alert ID is required" },
        { status: 400 }
      );
    }

    if (!deletedAlert) {
      return NextResponse.json(
        { success: false, message: "Alert not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Alert deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("DELETE Alert Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete alert" },
      { status: 500 }
    );
  }
}
