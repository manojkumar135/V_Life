import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Login } from "@/models/login";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const secretKey = process.env.JWT_SECRET;
const secretRefreshKey = process.env.JWT_REFRESH_SECRET;

export async function POST(request) {
    try {
        await connectDB();
        const body = await request.json();
        const { loginId, password } = body;

        if (!loginId || !password) {
            return NextResponse.json(
                { success: false, message: "User ID/Contact and password are required" },
                { status: 400 }
            );
        }

        // find user by user_id OR contact
        const user = await Login.findOne({
            $or: [{ login_id: loginId }, { user_id: loginId }, { contact: loginId }],
        });

        if (!user) {
            return NextResponse.json(
                { success: false, message: "Invalid User ID or Contact" },
                { status: 404 }
            );
        }

        // check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return NextResponse.json(
                { success: false, message: "Incorrect password" },
                { status: 401 }
            );
        }

        // ✅ Generate tokens
        const payload = { id: user._id, role: user.role, loginId: user.login_id };

        const accessToken = jwt.sign(payload, secretKey, { expiresIn: "15m" }); // short-lived
        const refreshToken = jwt.sign(payload, secretRefreshKey, { expiresIn: "7d" }); // long-lived

        // ✅ Set cookies (HttpOnly, Secure in production)
        const response = NextResponse.json(
            { success: true, message: "Login successful", data: user, },
            { status: 200 }
        );

        response.cookies.set("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 15, // 15 min
            path: "/",
        });

        response.cookies.set("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
        });

        return response;
    } catch (error) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
