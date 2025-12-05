"use client";

import { useFormik } from "formik";
import * as Yup from "yup";
import { TfiLock } from "react-icons/tfi";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";

// import { useContext } from "react";

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

  // Formik + Yup schema
  const formik = useFormik({
    initialValues: {
      loginId: "", // user_id or contact
      password: "",
    },
    validationSchema: Yup.object({
      loginId: Yup.string().required("* User ID / Contact is required"),
      password: Yup.string().required("* Password is required"),
    }),
    // ...existing code...

    onSubmit: async (values) => {
      setLoading(true);
      try {
        const res = await axios.post(
          "/api/login-operations/signIn-operations",
          values
        ); // <-- use POST

        // console.log("Login response:", res.data.data.score);
        if (res.data.success) {
          setUser({
            login_id: res.data.data.login_id,
            user_id: res.data.data.user_id,
            user_name: res.data.data.user_name,
            role: res.data.data.role,
            mail: res.data.data.mail,
            contact: res.data.data.contact,
            status: res.data.data.status,
            theme: res.data.data.theme,
            wallet_id: res.data.data.wallet_id,
            score: res.data.data.score,
          });
          // ✅ Pass theme string directly
          // if (res.data.data.theme) {
          //   setTheme(res.data.data.theme as ThemeType);
          // }

          ShowToast.success("Login successful!");
          router.push("/dashboards");
        } else {
          ShowToast.error(res.data.message || "Login failed");
        }
      } catch (err: any) {
        console.log("error:", err.response?.data?.message);

        const errorMessage =
          err.response?.data?.message || err.message || "Something went wrong";

        console.log("toast message:", errorMessage);

        ShowToast?.error?.(errorMessage); // safe call if function exists
      } finally {
        setLoading(false);
      }
    },
    // ...existing code...
  });

  const handleForgotPassword = () => {
    router.push("/auth/forgot");
  };

  const handleNavigateToSignup = () => {
    router.push("/auth/register");
  };

  return (
    <>
      {/* <Toaster position="top-right" richColors closeButton /> */}

      <div className="flex flex-row max-md:flex-col h-screen overflow-hidden bg-[#106187]/85 -pt-20">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40  backdrop-blur-sm">
            <Loader />
          </div>
        )}
        {/* Left Illustration Section */}
        <div className="w-1/2 max-md:w-full flex items-center justify-center p-10 max-lg:p-5 max-md:hidden">
          <Image
            src={Images.LoginImage}
            alt="Login Illustration"
            width={500}
            height={500}
            className="w-4/5 max-md:w-full max-lg:w-full max-md:ml-1 max-lg:ml-16"
          />
        </div>

        {/* Right Login Form */}
        <div className="w-1/2 max-lg:w-full flex flex-col justify-center items-center overflow-y-auto max-lg:py-6 max-md:h-full">
          <div className="w-[70%] max-md:w-[90%] flex flex-col items-center pt-10 pb-10 px-8 bg-[#fffff0] rounded-3xl shadow max-lg:pb-8 max-lg:pt-5">
            {/* Logo - Top Left */}
            <Image
              src={Images.MaverickLogo}
              alt="Logo"
              width={180}
              height={120}
              className="mb-6 border-0 border-black"
            />

            {/* Center content below logo */}
            <div className="w-full flex flex-col justify-center items-center">
              {/* <p className="text-[1.6rem] max-md:text-[1.2rem] max-lg:text-[1.2rem] font-bold text-black mb-4 max-lg:mb-3">
                Login
              </p> */}

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

                {/* Password with Show/Hide */}
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

                {/* Forgot password */}
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
                ? "bg-gray-400 text-white cursor-none"
                : "bg-gradient-to-r from-[#0C3978] via-[#106187] to-[#16B8E4] text-white cursor-pointer"
            }`}
                >
                  Login
                </button>

                {/* Signup prompt */}
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
