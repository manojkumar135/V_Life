"use client";

import { useState } from "react";
import { FiMail } from "react-icons/fi";
import { FaUser, FaPhone, FaUsers } from "react-icons/fa";
import { IoIosLink } from "react-icons/io";
import { IoCalendarOutline } from "react-icons/io5";

import { useFormik } from "formik";
import * as Yup from "yup";
import Select from "react-select";
import { useRouter } from "next/navigation";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const teams = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Custom styles for React Select
  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      paddingLeft: "1.8rem", // space for icon
      borderRadius: "0.375rem",
      border: "1px solid #94a3b8",
      minHeight: "1.5rem",
      backgroundColor: "transparent",
      // boxShadow: state.isFocused
      //   ? "0 0 0 2px rgba(156, 163, 175, 0.3)"
      //   : undefined,
      "&:hover": { borderColor: "#94a3b8" }, // gray-400 hover
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: "0 0.75rem",
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: "#9ca3af", // gray-400
      // color: "#6b7280", // gray-500
    }),
  };

  const validationSchema = Yup.object({
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
      .required("Date of Birth is required")
      .max(new Date(), "Date of Birth cannot be in the future")
      .test("age", "You must be at least 18 years old", function (value) {
        if (!value) return false;
        const today = new Date();
        const birthDate = new Date(value);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();

        if (
          age > 18 ||
          (age === 18 && (monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0)))
        ) {
          return true;
        }
        return false;
      }),
    referBy: Yup.string().required("* Referral ID is required"),
    team: Yup.string().required("* Team is required"),
    // terms: Yup.boolean().oneOf(
    //   [true],
    //   "You cannot proceed without accepting the Terms and Conditions."
    // ),
  });

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
      terms: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const res = await axios.post("/api/users-operations", values);

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

  const handleNavigateToLogin = () => {
    router.push("/auth/login");
  };

  return (
    <div className="flex flex-row max-md:flex-col h-screen overflow-hidden bg-[#FFFDD0]">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      {/* Left Form Section */}
      <div className="w-1/2 max-md:w-full max-lg:w-3/5 flex flex-col justify-center items-center lg:items-end overflow-y-auto max-lg:py-6 max-md:h-full">
        <div className="w-[70%] max-lg:w-[90%] xl:w-[70%] flex flex-col justify-center items-center py-6 px-8 bg-[#fffff0] rounded-3xl shadow-lg border-gray-200 border xl:h-[85%]">
          <p className="text-[1.5rem] max-md:text-[1.2rem] max-lg:text-[1.2rem] font-bold text-black mb-5">
            Sign Up
          </p>

          <form onSubmit={formik.handleSubmit} className="w-full space-y-3">
            {/* Name */}
            <div className="flex flex-col">
              <div className="relative">
                <FaUser className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  name="user_name"
                  placeholder="Full Name"
                  value={formik.values.user_name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <span className="text-red-500 text-sm mt-1 h-4 block">
                {formik.touched.user_name && formik.errors.user_name
                  ? formik.errors.user_name
                  : "\u00A0"}
              </span>
            </div>

            {/* DOB */}
            <div className="flex flex-col">
              <div className="relative">
                <IoCalendarOutline className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="date"
                  name="dob"
                  placeholder="Date of Birth"
                  value={formik.values.dob}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  min="1900-01-01"
                  max={new Date().toISOString().split("T")[0]}
                  required
                  className="uppercase w-full pl-10 pr-4 py-2 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <span className="text-red-500 text-sm mt-1 h-4 block">
                {formik.touched.dob && formik.errors.dob
                  ? formik.errors.dob
                  : "\u00A0"}
              </span>
            </div>

            {/* Email */}
            <div className="flex flex-col">
              <div className="relative">
                <FiMail className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="email"
                  name="mail"
                  placeholder="Email"
                  value={formik.values.mail}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <span className="text-red-500 text-sm mt-1 h-4 block">
                {formik.touched.mail && formik.errors.mail
                  ? formik.errors.mail
                  : "\u00A0"}
              </span>
            </div>

            {/* Contact */}
            <div className="flex flex-col">
              <div className="relative">
                <FaPhone className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  name="contact"
                  placeholder="Contact Number"
                  value={formik.values.contact}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <span className="text-red-500 text-sm mt-1 h-4 block">
                {formik.touched.contact && formik.errors.contact
                  ? formik.errors.contact
                  : "\u00A0"}
              </span>
            </div>

            {/* Referral ID */}
            <div className="flex flex-col">
              <div className="relative">
                <IoIosLink className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  name="referBy"
                  placeholder="Referral ID"
                  value={formik.values.referBy}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <span className="text-red-500 text-sm mt-1 h-4 block">
                {formik.touched.referBy && formik.errors.referBy
                  ? formik.errors.referBy
                  : "\u00A0"}
              </span>
            </div>

            {/* Team */}
            <div className="flex flex-col">
              <div className="relative">
                <FaUsers className="absolute left-3 top-3 text-gray-500" />
                <Select
                  options={teams}
                  name="team"
                  value={teams.find((t) => t.value === formik.values.team)}
                  onChange={(selectedOption: any) =>
                    formik.setFieldValue("team", selectedOption?.value || "")
                  }
                  onBlur={() => formik.setFieldTouched("team", true)}
                  styles={customStyles}
                  placeholder="Select Team"
                  className="w-full "
                />
              </div>
              <span className="text-red-500 text-sm mt-1 h-4 block">
                {formik.touched.team && formik.errors.team
                  ? formik.errors.team
                  : "\u00A0"}
              </span>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-center space-x-2 mt-1">
              <input
                type="checkbox"
                name="terms"
                checked={formik.values.terms}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="
    h-4 w-4
    border border-gray-400 rounded
    bg-white
    appearance-none
    checked:bg-yellow-500
    checked:border-yellow-500
    checked:before:content-['✔']
    checked:before:text-black
    checked:before:flex
    checked:before:items-center
    checked:before:justify-center
  "
              />

              <label htmlFor="terms" className="text-sm text-gray-700">
                I agree to the{" "}
                <span className="text-blue-600 cursor-pointer">
                  Terms and Conditions
                </span>
              </label>
            </div>
            <span className="text-red-500 text-sm mt-1 h-4 block">
              {formik.touched.terms && formik.errors.terms
                ? formik.errors.terms
                : "\u00A0"}
            </span>

            {/* Register Button */}
            <button
              type="submit"
              disabled={
                loading ||
                !formik.isValid ||
                !formik.dirty ||
                !formik.values.terms
              }
              className={`w-full py-2 font-semibold rounded-md transition-colors text-[1.2rem] max-lg:text-[1rem] 
    ${
      loading || !formik.isValid || !formik.dirty
        ? "bg-gray-400 text-white cursor-not-allowed"
        : "bg-[#FFD700] text-black hover:bg-yellow-400 cursor-pointer"
    }`}
            >
              Register
            </button>

            {/* Login prompt */}
            <div className="text-center text-sm text-black -mt-1 leading-tight">
              Already have an account ?{" "}
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

      {/* Right Illustration */}
      <div className="w-1/2 max-lg:w-2/5 flex items-center justify-center p-1 max-lg:p-0 max-md:hidden">
        <DotLottieReact
          src="https://lottie.host/b80db1a0-c452-4ff8-847a-eed370430e0e/DePiYXvQ6y.lottie"
          loop
          autoplay
          style={{ width: "70%", height: "70%" }}
        />
      </div>
    </div>
  );
}
