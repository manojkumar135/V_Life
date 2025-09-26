import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";

// Example: extend your UserType in models/user.ts
export interface UserType {
  user_id: string;
  user_name?: string;
  mail?: string;
  contact?: string;
  referred_users?: string[];
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    const search = searchParams.get("search") || "";

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    // 1️⃣ Find the user by user_id
    const user = await User.findOne({ user_id }).lean<UserType>();
    if (!user || !user.referred_users?.length) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // 2️⃣ Build query for referred_users
    let query: any = { user_id: { $in: user.referred_users } };

    if (search) {
      const searchTerms = search
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      query.$or = searchTerms.flatMap((term) => {
        const regex = new RegExp("^" + term, "i");
        return [
          { user_id: regex },
          { user_name: regex },
          { mail: regex },
          { contact: regex },
          { address: regex },
          { pincode: regex },
          { country: regex },
          { state: regex },
          { district: regex },
          { locality: regex },
          { user_status: regex },
        ];
      });
    }

    // 3️⃣ Fetch users
    const users = await User.find(query).lean();

    return NextResponse.json({
      data: users,
      total: users.length,
    });
  } catch (error) {
    console.error("❌ Error in /api/directteam-operations:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
