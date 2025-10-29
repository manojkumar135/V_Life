"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import Select from "react-select";
import axios from "axios";
import { FiMail } from "react-icons/fi";
import { FaUser, FaPhone, FaUsers } from "react-icons/fa";
import { IoIosLink } from "react-icons/io";
import { IoCalendarOutline } from "react-icons/io5";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import TermsModal from "@/components/TermsModal/terms";
import customSelectStyles from "@/components/common/CustomSelectStyles";
import type { DatePickerProps } from "antd";
import { DatePicker, Space } from "antd";

export const dynamic = "force-dynamic";

const teams = [
  { value: "left", label: "Organization 1" },
  { value: "right", label: "Organization 2" },
];

function RegisterContent() {
  const [loading, setLoading] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const onChange: DatePickerProps["onChange"] = (date, dateString) => {
    console.log(date, dateString);
  };

  const router = useRouter();
  const params = useSearchParams();

  const formik = useFormik({
    initialValues: {
      user_name: "",
      dob: "",
      mail: "",
      contact: "",
      password: "",
      referBy: "",
      role: "user",
      team: "",
      parent: "",
      terms: false,
    },
    validationSchema: Yup.object({
      user_name: Yup.string()
        .required("* Full Name is required")
        .min(2, "* Name must be at least 2 characters"),
      mail: Yup.string()
        .email("* Invalid email format")
        .required("* Email is required"),
      contact: Yup.string()
        .required("* Contact is required")
        .matches(/^[0-9]{10}$/, "* Contact must be a 10-digit number"),
      dob: Yup.date()
        .required("* Date of Birth is required")
        .max(new Date(), "* Date of Birth cannot be in the future")
        .test("age", "* You must be at least 18 years old", function (value) {
          if (!value) return false;
          const today = new Date();
          const birthDate = new Date(value);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          const dayDiff = today.getDate() - birthDate.getDate();
          return (
            age > 18 ||
            (age === 18 && (monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0)))
          );
        }),
      referBy: Yup.string().required("* Referral ID is required"),
      team: Yup.string().required("* Team is required"),
    }),
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const res = await axios.post("/api/users-operations", values);
        console.log(res);
        if (res.data.success) {
          ShowToast.success("Registration successful!");
          router.push("/auth/login");
        } else {
          ShowToast.error(res.data.message || "Registration failed");
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || err.message || "Something went wrong";
        ShowToast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    const referBy = params.get("referBy");
    const position = params.get("position");
    const parent = params.get("parent");

    if (referBy) formik.setFieldValue("referBy", referBy);
    if (position) formik.setFieldValue("team", position);
    if (parent) formik.setFieldValue("parent", parent);
  }, [params]);

  const handleNavigateToLogin = () => router.push("/auth/login");

  return (
    <div className="flex flex-row max-md:flex-col h-screen overflow-hidden bg-[#FFFDD0]">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      {/* Left Form Section */}
      <div className="w-1/2 max-lg:w-full max-xl:w-3/5 flex flex-col justify-center items-center lg:items-end overflow-y-auto max-lg:py-6 max-md:h-full">
        <div
          className="w-[70%] max-md:w-[90%] max-lg:w-[60%] xl:w-[70%] flex flex-col justify-center items-center py-6 max-md:py-4 px-8 bg-[#fffff0]
         rounded-3xl shadow-lg border-gray-200 border xl:h-[90%] max-md:h-[80%]"
        >
          <p className="text-[1.5rem] font-bold text-black xl:mb-3 mb-5">
            SIGN UP
          </p>

          <form
            onSubmit={formik.handleSubmit}
            className="w-full space-y-2 overflow-y-hidden"
          >
            {/* Name */}
            <div className="flex flex-col">
              <div className="relative">
                <FaUser className="absolute left-3 top-2 text-gray-500" />
                <input
                  type="text"
                  name="user_name"
                  placeholder="Full Name"
                  value={formik.values.user_name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-1 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <span className="text-red-500 text-xs mt-1 h-4 block">
                {formik.touched.user_name && formik.errors.user_name
                  ? formik.errors.user_name
                  : "\u00A0"}
              </span>
            </div>

            {/* DOB with DatePicker */}
            <div className="flex flex-col">
              <div className="relative">
                <IoCalendarOutline className="absolute left-3 top-2.5 text-gray-500 pointer-events-none" />

                <DatePicker
                  placeholder="Date of Birth"
                  onChange={(date) => {
                    formik.setFieldValue("dob", date ? date.toDate() : "");
                  }}
                  onBlur={() => formik.setFieldTouched("dob", true)}
                  format="DD-MM-YYYY"
                  inputReadOnly
                  classNames={{
                    popup: { root: "custom-datepicker-dropdown" },
                  }}
                  className="!w-full !pl-10 !pr-4 !py-[5px] !rounded-md !border !border-gray-400 
                 !focus:outline-none !focus:ring-2 !focus:ring-gray-200 !bg-transparent 
                 [&_.ant-picker-input>input::placeholder]:!text-gray-500
                 [&_.ant-picker-input>input::placeholder]:!text-[0.95rem]"
                  style={{
                    backgroundColor: "transparent",
                    borderColor: "#9ca3af",
                    height: "34px",
                  }}
                />
              </div>

              <span className="text-red-500 text-xs mt-1 h-4 block">
                {formik.touched.dob && formik.errors.dob
                  ? formik.errors.dob
                  : "\u00A0"}
              </span>
            </div>

            {/* Email */}
            <div className="flex flex-col">
              <div className="relative">
                <FiMail className="absolute left-3 top-2 text-gray-500" />
                <input
                  type="email"
                  name="mail"
                  placeholder="Email"
                  value={formik.values.mail}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-1 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <span className="text-red-500 text-xs mt-1 h-4 block">
                {formik.touched.mail && formik.errors.mail
                  ? formik.errors.mail
                  : "\u00A0"}
              </span>
            </div>

            {/* Contact */}
            <div className="flex flex-col">
              <div className="relative">
                <FaPhone className="absolute left-3 top-2 text-gray-500" />
                <input
                  type="text"
                  name="contact"
                  placeholder="Contact Number"
                  value={formik.values.contact}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-1 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <span className="text-red-500 text-xs mt-1 h-4 block">
                {formik.touched.contact && formik.errors.contact
                  ? formik.errors.contact
                  : "\u00A0"}
              </span>
            </div>

            {/* Referral ID */}
            <div className="flex flex-col">
              <div className="relative">
                <IoIosLink className="absolute left-3 top-2 text-gray-500" />
                <input
                  type="text"
                  name="referBy"
                  placeholder="Referral ID"
                  value={formik.values.referBy}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-1 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <span className="text-red-500 text-xs mt-1 h-4 block">
                {formik.touched.referBy && formik.errors.referBy
                  ? formik.errors.referBy
                  : "\u00A0"}
              </span>
            </div>

            {/* Team */}
            <div className="flex flex-col">
              <div className="relative">
                <FaUsers className="absolute left-3 top-2.5 text-gray-500" />
                <Select
                  options={teams}
                  name="team"
                  value={
                    teams.find((t) => t.value === formik.values.team) || null
                  }
                  onChange={(selectedOption: any) =>
                    formik.setFieldValue(
                      "team",
                      selectedOption ? selectedOption.value : ""
                    )
                  }
                  onBlur={() => formik.setFieldTouched("team", true)}
                  styles={customSelectStyles}
                  placeholder="Select Organization"
                  className="w-full"
                />
              </div>
              <span className="text-red-500 text-xs mt-1 h-4 block">
                {formik.touched.team && formik.errors.team
                  ? formik.errors.team
                  : "\u00A0"}
              </span>
            </div>

            {/* Terms */}
            <div className="flex items-center space-x-2 mt-0 max-md:mt-5">
              <input
                type="checkbox"
                name="terms"
                checked={formik.values.terms}
                onChange={formik.handleChange}
                className="h-4 w-4 border border-gray-400 rounded bg-white appearance-none cursor-pointer
                 checked:bg-yellow-500 checked:border-yellow-500 relative checked:before:content-['✔'] checked:before:absolute checked:before:top-[1px] checked:before:left-1/2 checked:before:-translate-x-1/2 checked:before:text-[0.75rem] checked:before:leading-none checked:before:text-black"
              />
              <label htmlFor="terms" className="text-sm text-gray-700">
                I agree to the{" "}
                <span
                  className="text-blue-600 cursor-pointer"
                  onClick={() => setIsTermsOpen(true)}
                >
                  Terms and Conditions
                </span>
              </label>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={
                loading ||
                !formik.isValid ||
                !formik.dirty ||
                !formik.values.terms
              }
              className={`w-full py-1 mt-1 font-semibold rounded-md transition-colors text-[1.2rem] 
                ${
                  loading ||
                  !formik.isValid ||
                  !formik.dirty ||
                  !formik.values.terms
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-[#FFD700] text-black hover:bg-yellow-400 cursor-pointer"
                }`}
            >
              Register
            </button>

            {/* Login */}
            <div className="text-center text-sm text-black mt-1">
              Already have an account?{" "}
              <span
                onClick={handleNavigateToLogin}
                className="inline-flex items-center text-blue-600 font-medium cursor-pointer"
              >
                Login here!
              </span>
            </div>
          </form>
        </div>
      </div>

      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

      {/* Right Illustration */}
      <div className="w-1/2 max-xl:w-2/5 flex items-center justify-center p-1 max-lg:p-0 max-lg:hidden">
        <DotLottieReact
          src="https://lottie.host/b80db1a0-c452-4ff8-847a-eed370430e0e/DePiYXvQ6y.lottie"
          loop
          autoplay
          style={{ width: "70%", height: "78%" }}
        />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-lg font-semibold">
          Loading registration form...
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
