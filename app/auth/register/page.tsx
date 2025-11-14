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
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import TermsModal from "@/components/TermsModal/terms";
import customSelectStyles from "@/components/common/CustomSelectStyles";

import CryptoJS from "crypto-js";

export const dynamic = "force-dynamic";

const teams = [
  { value: "left", label: "Organization 1" },
  { value: "right", label: "Organization 2" },
];

function RegisterContent() {
  const SECRET_KEY = process.env.NEXT_PUBLIC_REF_KEY || "";

  const [loading, setLoading] = useState(false);
  // const [isTermsOpen, setIsTermsOpen] = useState(false);

  const [modalType, setModalType] = useState<
    "terms" | "privacy" | "refund" | null
  >(null);

  const openModal = (type: "terms" | "privacy" | "refund") =>
    setModalType(type);
  const closeModal = () => setModalType(null);

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
        if (res.data.success) {
          ShowToast.success("Registration successful!");
          router.push("/auth/login");
        } else {
          ShowToast.error(res.data.message || "Registration failed");
        }
      } catch (err: any) {
        ShowToast.error(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    },
  });

  const [isInitialSet, setIsInitialSet] = useState(false);

  useEffect(() => {
    if (isInitialSet) return;

    const ref = params.get("ref");
    const parent = params.get("parent");

    if (ref) {
      try {
        const decrypted = CryptoJS.AES.decrypt(
          decodeURIComponent(ref),
          SECRET_KEY
        ).toString(CryptoJS.enc.Utf8);

        const data = JSON.parse(decrypted);
        // { referBy: "...", position: "left/right" }

        if (data.referBy) formik.setFieldValue("referBy", data.referBy);
        if (data.position) formik.setFieldValue("team", data.position);
      } catch (err) {
        console.error("Invalid referral code", err);
      }
    }

    if (parent) formik.setFieldValue("parent", parent);

    setIsInitialSet(true);
  }, [params, isInitialSet]);

  const handleNavigateToLogin = () => router.push("/auth/login");

  return (
    <div className="flex flex-row max-md:flex-col h-screen overflow-hidden bg-[#FFFDD0]">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      {/* Form Section */}
      <div className="w-1/2 max-lg:w-full max-xl:w-3/5 flex flex-col justify-center items-center lg:items-end overflow-y-auto max-lg:py-6">
        <div className="w-[70%] max-md:w-[90%] max-lg:w-[60%] xl:w-[70%] flex flex-col justify-center items-center py-6 px-8 bg-[#fffff0] rounded-3xl shadow-lg border border-gray-200 max-md:mt-10">
          <p className="text-[1.4rem] font-bold text-black mb-5 xl:mb-3">
            SIGN UP
          </p>

          <form onSubmit={formik.handleSubmit} className="w-full space-y-2">
            {/* Name */}
            <div>
              <div className="relative">
                <FaUser className="absolute left-3 top-2 text-gray-500" />
                <input
                  type="text"
                  name="user_name"
                  placeholder="Full Name"
                  value={formik.values.user_name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-1 rounded-md border border-gray-400 focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <span className="text-red-500 text-xs mt-1 block">
                {formik.touched.user_name && formik.errors.user_name
                  ? formik.errors.user_name
                  : "\u00A0"}
              </span>
            </div>

            {/* DOB */}
            <div>
              <div className="relative" inputMode="none">
                <IoCalendarOutline className="absolute left-3 top-2.5 text-gray-500 pointer-events-none" />
                <DatePicker
                  selected={
                    formik.values.dob ? new Date(formik.values.dob) : null
                  }
                  onChange={(date: Date | null) => {
                    formik.setFieldValue(
                      "dob",
                      date ? date.toISOString().split("T")[0] : ""
                    );
                  }}
                  onBlur={() => formik.setFieldTouched("dob", true)}
                  dateFormat="dd-MM-yyyy"
                  placeholderText="Date of Birth"
                  maxDate={new Date()}
                  showYearDropdown
                  showMonthDropdown
                  scrollableYearDropdown
                  yearDropdownItemNumber={100}
                  popperPlacement="bottom-start"
                  popperClassName="z-[9999]"
                  onKeyDown={(e) => e.preventDefault()}
                  shouldCloseOnSelect
                  calendarClassName="custom-datepicker-calendar"
                  className={`w-full pl-10 pr-4 py-1 rounded-md border ${
                    formik.touched.dob && formik.errors.dob
                      ? "border-red-500"
                      : "border-gray-400"
                  } focus:ring-2 focus:ring-gray-200`}
                  renderCustomHeader={({
                    date,
                    changeYear,
                    changeMonth,
                    decreaseMonth,
                    increaseMonth,
                    prevMonthButtonDisabled,
                    nextMonthButtonDisabled,
                  }) => {
                    const currentYear = new Date().getFullYear();
                    const years = Array.from(
                      { length: 101 },
                      (_, i) => currentYear - i
                    ); // Descending years
                    const monthOptions = Array.from({ length: 12 }).map(
                      (_, m) => ({
                        value: m,
                        label: new Date(0, m).toLocaleString("default", {
                          month: "long",
                        }),
                      })
                    );
                    const yearOptions = years.map((y) => ({
                      value: y,
                      label: y.toString(),
                    }));

                    const selectedMonth = monthOptions.find(
                      (m) => m.value === date.getMonth()
                    );
                    const selectedYear = yearOptions.find(
                      (y) => y.value === date.getFullYear()
                    );

                    return (
                      <div className="flex items-center justify-center gap-2 px-2 py-1 flex-wrap">
                        <button
                          type="button"
                          onClick={decreaseMonth}
                          disabled={prevMonthButtonDisabled}
                          className="px-2 rounded hover:bg-gray-100 disabled:opacity-40 text-lg font-semibold"
                        >
                          ‹
                        </button>
                        <div className="min-w-[100px] xl:min-w-[120px]">
                          <Select
                            options={monthOptions}
                            value={selectedMonth}
                            onChange={(selected) =>
                              selected && changeMonth(selected.value)
                            }
                            styles={{
                              control: (base) => ({
                                ...base,
                                minHeight: "34px",
                                fontSize: "0.85rem",
                              }),
                              menu: (base) => ({
                                ...base,
                                zIndex: 9999,
                                fontSize: "0.85rem",
                              }),
                            }}
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                          />
                        </div>
                        <div className="min-w-[80px] xl:min-w-[100px] ">
                          <Select
                            options={yearOptions}
                            value={selectedYear}
                            onChange={(selected) =>
                              selected && changeYear(selected.value)
                            }
                            styles={{
                              control: (base) => ({
                                ...base,
                                minHeight: "34px",
                                fontSize: "0.85rem",
                              }),
                              menu: (base) => ({
                                ...base,
                                zIndex: 9999,
                                // maxHeight: "200px",
                                fontSize: "0.85rem",
                                overflowY: "auto",
                              }),
                            }}
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={increaseMonth}
                          disabled={nextMonthButtonDisabled}
                          className="px-2 rounded hover:bg-gray-100 disabled:opacity-40 text-lg font-semibold"
                        >
                          ›
                        </button>
                      </div>
                    );
                  }}
                />
              </div>
              <span className="text-red-500 text-xs mt-1 block">
                {formik.touched.dob && formik.errors.dob
                  ? formik.errors.dob
                  : "\u00A0"}
              </span>
            </div>

            {/* Email */}
            <div>
              <div className="relative">
                <FiMail className="absolute left-3 top-2 text-gray-500" />
                <input
                  type="email"
                  name="mail"
                  placeholder="Email"
                  value={formik.values.mail}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-1 rounded-md border border-gray-400 focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <span className="text-red-500 text-xs mt-1 block">
                {formik.touched.mail && formik.errors.mail
                  ? formik.errors.mail
                  : "\u00A0"}
              </span>
            </div>

            {/* Contact */}
            <div>
              <div className="relative">
                <FaPhone className="absolute left-3 top-2 text-gray-500" />
                <input
                  type="text"
                  name="contact"
                  placeholder="Contact Number"
                  value={formik.values.contact}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-1 rounded-md border border-gray-400 focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <span className="text-red-500 text-xs mt-1 block">
                {formik.touched.contact && formik.errors.contact
                  ? formik.errors.contact
                  : "\u00A0"}
              </span>
            </div>

            {/* Referral */}
            <div>
              <div className="relative">
                <IoIosLink className="absolute left-3 top-2 text-gray-500" />
                <input
                  type="text"
                  name="referBy"
                  placeholder="Referral ID"
                  value={formik.values.referBy}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly
                  className="w-full pl-10 pr-4 py-1 rounded-md border border-gray-400 focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <span className="text-red-500 text-xs mt-1 block">
                {formik.touched.referBy && formik.errors.referBy
                  ? formik.errors.referBy
                  : "\u00A0"}
              </span>
            </div>

            {/* Team */}
            <div>
              <div className="relative">
                <FaUsers className="absolute left-3 top-2.5 text-gray-500" />
                <Select
                  options={teams}
                  name="team"
                  value={teams.find((t) => t.value === formik.values.team)}
                  onChange={(opt) =>
                    formik.setFieldValue("team", opt?.value || "")
                  }
                  onBlur={() => formik.setFieldTouched("team", true)}
                  styles={customSelectStyles}
                  isDisabled={true}
                  placeholder="Select Organization"
                  className="w-full"
                />
              </div>
              <span className="text-red-500 text-xs mt-1 block">
                {formik.touched.team && formik.errors.team
                  ? formik.errors.team
                  : "\u00A0"}
              </span>
            </div>

            {/* Terms */}
            <div className="flex items-center space-x-2 ">
              <input
                type="checkbox"
                name="terms"
                checked={formik.values.terms}
                onChange={formik.handleChange}
                className="h-4 w-4 border border-gray-400 rounded bg-white appearance-none cursor-pointer checked:bg-yellow-500 checked:border-yellow-500 relative checked:before:content-['✔'] checked:before:absolute checked:before:top-[1px] checked:before:left-1/2 checked:before:-translate-x-1/2 checked:before:text-[0.75rem] checked:before:text-black"
              />
              {/* <label htmlFor="terms" className="text-xs text-gray-700">
                I agree to the{" "}
                <span
                  className="text-blue-600 cursor-pointer"
                  onClick={() => setIsTermsOpen(true)}
                >
                  Terms and Conditions
                </span>
              </label> */}
              <label
                htmlFor="terms"
                className="max-xs:text-[0.7rem] text-xs xl:text-sm text-gray-700"
              >
                I agree to the{" "}
                <span
                  className="text-blue-600 cursor-pointer"
                  onClick={() => openModal("terms")}
                >
                  Terms
                </span>
                ,{" "}
                <span
                  className="text-blue-600 cursor-pointer"
                  onClick={() => openModal("privacy")}
                >
                  Privacy
                </span>{" "}
                and{" "}
                <span
                  className="text-blue-600 cursor-pointer"
                  onClick={() => openModal("refund")}
                >
                  Refund policy
                </span>
              </label>
            </div>

            {/* Register */}
            <button
              type="submit"
              disabled={
                loading ||
                !formik.isValid ||
                !formik.dirty ||
                !formik.values.terms
              }
              className={`w-full py-1 mt-1 font-semibold rounded-md text-[1.2rem] ${
                loading ||
                !formik.isValid ||
                !formik.dirty ||
                !formik.values.terms
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-[#FFD700] text-black hover:bg-yellow-400"
              }`}
            >
              Register
            </button>

            <div className="text-center text-sm text-black mt-1">
              Already have an account?{" "}
              <span
                onClick={handleNavigateToLogin}
                className="text-blue-600 font-medium cursor-pointer"
              >
                Login here!
              </span>
            </div>
          </form>
        </div>
      </div>

      <TermsModal isOpen={!!modalType} type={modalType} onClose={closeModal} />

      {/* Right Illustration */}
      <div className="w-1/2 max-xl:w-2/5 flex items-center justify-center p-1 max-lg:hidden">
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
