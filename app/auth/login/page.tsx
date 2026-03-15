"use client";

import { useFormik } from "formik";
import * as Yup from "yup";
import { TfiLock } from "react-icons/tfi";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
import { Toaster } from "sonner";
import { FaRegUser } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useState } from "react";
import Image from "next/image";
import ShowToast from "@/components/common/Toast/toast";
import Images from "@/constant/Image";
import Loader from "@/components/common/loader";
import { useVLife, ThemeType } from "@/store/context";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { user, setUser, clearUser } = useVLife();

  const formik = useFormik({
    initialValues: {
      loginId: "",
      password: "",
    },
    validationSchema: Yup.object({
      loginId: Yup.string().required("* User ID / Contact is required"),
      password: Yup.string().required("* Password is required"),
    }),

    onSubmit: async (values) => {
      setLoading(true);
      try {
        const res = await axios.post(
          "/api/login-operations/signIn-operations",
          values,
        );

        if (res.data.success) {
          const userData = res.data.data;

          setUser({
            login_id: res.data.data.login_id,
            user_id: res.data.data.user_id,
            user_name: res.data.data.user_name,
            role: res.data.data.role,
            mail: res.data.data.mail,
            gender: res.data.data.gender,
            contact: res.data.data.contact,
            status: res.data.data.status,
            theme: res.data.data.theme,
            wallet_id: res.data.data.wallet_id,
            score: res.data.data.score,
            reward: res.data.data.reward,
          });

          sessionStorage.setItem("showLoginPopup", "true");

          if (userData.role === "admin") {
            router.push("/AdminDashboard");
          } else {
            router.push("/dashboards");
          }
        } else {
          ShowToast.error(res.data.message || "Login failed");
        }
      } catch (err: any) {
        console.log("error:", err.response?.data?.message);
        const errorMessage =
          err.response?.data?.message || err.message || "Something went wrong";
        console.log("toast message:", errorMessage);
        ShowToast?.error?.(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  const handleForgotPassword = () => {
    router.push("/auth/forgot");
  };

  const handleNavigateToSignup = () => {
    router.push("/auth/register");
  };

  return (
    <>
      <div className="flex flex-row max-md:flex-col h-screen overflow-hidden bg-gradient-to-l from-[#0C3978] via-[#106187] to-[#16B8E4]">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        {/* ─── Left Panel: Full white bg with floating image cards ─── */}
        <div
          className="w-1/2 max-md:hidden shrink-0"
          style={{
            background: "#ffffff",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 24px",
          }}
        >
          {/*
    ┌─────────────┬────────────┐
    │   Image 1   │            │
    │ (top-left)  │  Image 2   │
    ├─────────────┤  (tall R)  │
    │             ├────────────┤
    │   Image 3   │  Image 4   │
    │  (tall L)   │ (small BR) │
    └─────────────┴────────────┘
  */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gridTemplateRows: "1fr 0.6fr 0.5fr 0.8fr",
              gap: "12px",
              width: "100%",
              height: "100%",
            }}
          >
            {/* Image 1 — Top Left (shorter) */}
            <div
              style={{
                gridColumn: "1/2",
                gridRow: "1/2",
                borderRadius: "14px",
                overflow: "hidden",
                position: "relative",
                border: "4px solid #ffffff",
                boxShadow:
                  "0 6px 24px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.10)",
                background: "#f0f4f8",
              }}
            >
              <Image
                src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1770376659/08bf31d26f0ffa62493f44ef6a677ec5af86a0ef_p0utrl.jpg"
                alt="Product image 1"
                fill
                style={{ objectFit: "cover" }}
                sizes="25vw"
              />
            </div>

            {/* Image 2 — Right Tall (spans row 1+2) */}
            <div
              style={{
                gridColumn: "2/3",
                gridRow: "1/3",
                borderRadius: "14px",
                overflow: "hidden",
                position: "relative",
                border: "4px solid #ffffff",
                boxShadow:
                  "0 8px 28px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
                background: "#f0f4f8",
              }}
            >
              <Image
                src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1773573156/long_image_nmg7jp.jpg"
                alt="Product image 2"
                fill
                style={{ objectFit: "cover" }}
                sizes="25vw"
              />
            </div>

            {/* Image 3 — Left Tall (spans row 2+3+4) */}
            <div
              style={{
                gridColumn: "1/2",
                gridRow: "2/5",
                borderRadius: "14px",
                overflow: "hidden",
                position: "relative",
                border: "4px solid #ffffff",
                boxShadow:
                  "0 10px 32px rgba(0,0,0,0.18), 0 3px 10px rgba(0,0,0,0.10)",
                background: "#f0f4f8",
              }}
            >
              <Image
                src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1773572909/WhatsApp_Image_2026-03-15_at_4.35.45_PM_ylenhs.jpg"
                alt="Product image 3"
                fill
                style={{ objectFit: "cover" }}
                sizes="25vw"
              />
            </div>

            {/* Image 4 — Bottom Right (small) */}
            <div
              style={{
                gridColumn: "2/3",
                gridRow: "3/5",
                borderRadius: "14px",
                overflow: "hidden",
                position: "relative",
                border: "4px solid #ffffff",
                boxShadow:
                  "0 6px 20px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)",
                background: "#f0f4f8",
              }}
            >
              <Image
                src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1770376659/08bf31d26f0ffa62493f44ef6a677ec5af86a0ef_p0utrl.jpg"
                alt="Product image 4"
                fill
                style={{ objectFit: "cover" }}
                sizes="25vw"
              />
            </div>
          </div>
        </div>

        {/* ─── Right Login Form (unchanged) ─── */}
        <div className="w-1/2 max-lg:w-full max-md:w-full flex flex-col justify-center items-center overflow-y-auto max-lg:py-6 max-md:h-full">
          <div className="w-[70%] max-md:w-[90%] flex flex-col items-center pt-10 pb-10 px-8 bg-[#fffff0] rounded-3xl shadow max-lg:pb-8 max-lg:pt-5">
            {/* Logo */}
            <Image
              src={Images.MaverickLogo}
              alt="Logo"
              width={180}
              height={120}
              className="mb-6 border-0 border-black"
            />

            <div className="w-full flex flex-col justify-center items-center">
              <form onSubmit={formik.handleSubmit} className="w-full space-y-6">
                {/* User ID / Contact */}
                <div className="flex flex-col">
                  <div className="relative">
                    <FaRegUser className="absolute left-3 top-3 text-gray-500" />
                    <input
                      type="text"
                      name="loginId"
                      placeholder="User ID / Contact"
                      value={formik.values.loginId}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                  <span
                    className={`text-red-500 text-sm mt-1 transition-opacity h-2 ${
                      formik.touched.loginId && formik.errors.loginId
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                  >
                    {formik.errors.loginId || "\u00A0"}
                  </span>
                </div>

                {/* Password */}
                <div className="flex flex-col">
                  <div className="relative">
                    <TfiLock className="absolute left-3 top-3 text-gray-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full pl-10 pr-10 py-2 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-800"
                    >
                      {showPassword ? <FaEye /> : <FaEyeSlash />}
                    </button>
                  </div>
                  <span
                    className={`text-red-500 text-sm mt-1 transition-opacity h-2 ${
                      formik.touched.password && formik.errors.password
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                  >
                    {formik.errors.password || "\u00A0"}
                  </span>
                </div>

                {/* Forgot Password */}
                <div className="text-right text-sm mb-3">
                  <span
                    onClick={handleForgotPassword}
                    className="text-blue-600 cursor-pointer"
                  >
                    Forgot password?
                  </span>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !formik.values.loginId.trim() ||
                    !formik.values.password.trim()
                  }
                  className={`w-full py-2 font-semibold rounded-md transition-colors text-[1.2rem] max-lg:text-[1rem]
                    ${
                      loading ||
                      !formik.values.loginId.trim() ||
                      !formik.values.password.trim()
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-linear-to-r from-[#0C3978] via-[#106187] to-[#16B8E4] text-white cursor-pointer"
                    }`}
                >
                  Login
                </button>

                {/* Sign Up prompt */}
                <div className="text-center text-sm text-gray-800 -mt-3">
                  Don&apos;t have an account ?{" "}
                  <span
                    onClick={handleNavigateToSignup}
                    className="inline-flex items-center text-blue-600 font-medium cursor-pointer"
                  >
                    Sign Up!
                  </span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
