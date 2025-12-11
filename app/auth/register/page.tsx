"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useFormik } from "formik";
import Image from "next/image";

import * as Yup from "yup";
import Select from "react-select";
import axios from "axios";
import { FiMail } from "react-icons/fi";
import { FaUser, FaPhone, FaUsers } from "react-icons/fa";
import { IoIosLink } from "react-icons/io";
import { IoCalendarOutline } from "react-icons/io5";
import { FaTransgender } from "react-icons/fa";
import { RiVerifiedBadgeFill } from "react-icons/ri";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import TermsModal from "@/components/TermsModal/terms";
import customSelectStyles from "@/components/common/CustomSelectStyles";

import CryptoJS from "crypto-js";
import Images from "@/constant/Image";

export const dynamic = "force-dynamic";

const teams = [
  { value: "left", label: "Left Team" },
  { value: "right", label: "Right Team" },
];

const gender = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "others", label: "Others" },
];

function RegisterContent() {
  const SECRET_KEY = process.env.NEXT_PUBLIC_REF_KEY || "";

  const [loading, setLoading] = useState(false);
  // const [isTermsOpen, setIsTermsOpen] = useState(false);

  const [panVerified, setPanVerified] = useState(false);
  const [panChecking, setPanChecking] = useState(false);

  const [isReferByPreset, setIsReferByPreset] = useState(false);
  const [isTeamPreset, setIsTeamPreset] = useState(false);

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
      gender: "",
      pan: "",
      panVerified: false,
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
      gender: Yup.string().required("* Gender is required"),
      panNumber: Yup.string()
        .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "* PAN must be 10 characters")
        .required("* PAN Number is required"),
    }),
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const res = await axios.post("/api/users-operations", values);
        if (res.data.success) {
          ShowToast.success("Registration successful!");
          router.push(
            `/auth/success?username=${encodeURIComponent(
              values.user_name
            )}&userId=${encodeURIComponent(
              res.data.userId
            )}&email=${encodeURIComponent(values.mail)}`
          );
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
    const referBy = params.get("referBy");
    const position = params.get("position");
    const parent = params.get("parent");

    let referPreset = false;
    let teamPreset = false;

    if (ref) {
      try {
        const decrypted = CryptoJS.AES.decrypt(
          decodeURIComponent(ref),
          SECRET_KEY
        ).toString(CryptoJS.enc.Utf8);

        const data = JSON.parse(decrypted);

        if (data.referBy) {
          formik.setFieldValue("referBy", data.referBy);
          referPreset = true;
        }
        if (data.position) {
          formik.setFieldValue("team", data.position);
          teamPreset = true;
        }
      } catch (err) {
        console.error("Invalid referral code", err);
      }
    }

    if (referBy) {
      formik.setFieldValue("referBy", referBy);
      referPreset = true;
    }
    if (position) {
      formik.setFieldValue("team", position);
      teamPreset = true;
    }
    if (parent) formik.setFieldValue("parent", parent);

    setIsReferByPreset(referPreset);
    setIsTeamPreset(teamPreset);
    setIsInitialSet(true);
  }, [params, isInitialSet]);

  // PAN duplicate check
  const checkPanDuplicate = async (pan: string) => {
    try {
      setPanChecking(true);
      const res = await axios.get(`/api/users-operations?pan=${pan}`);

      if (res.data.exists) {
        ShowToast.error("PAN already exists!");
        setPanVerified(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPanChecking(false);
    }
  };

  // PAN verification logic
  const verifyPan = async () => {
    try {
      setPanChecking(true);

      const res = await axios.post("/api/pancheck-operations", {
        pan_number: formik.values.pan,
      });

      const panData = res.data?.data?.data;

      if (res.data.success && panData?.status === "valid") {
        setPanVerified(true);
        ShowToast.success("PAN Verified!");
      } else {
        setPanVerified(false);
        ShowToast.error("Invalid PAN Number");
      }
    } catch (err) {
      console.error(err);
      ShowToast.error("PAN verification failed");
      setPanVerified(false);
    } finally {
      setPanChecking(false);
    }
  };

  const handleNavigateToLogin = () => router.push("/auth/login");

  return (
    <div className="flex flex-row max-md:flex-col h-screen overflow-hidden  bg-[#106187]/85">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      {/* Form Section */}
      <div className="w-full flex flex-col justify-center items-center py-10">
        <div
          className="w-[90%] max-sm:w-[92%] md:w-[70%] lg:w-[60%] xl:w-[60%] 
     flex flex-col justify-center items-center py-4 px-8 max-md:px-6
     bg-[#fffff0] rounded-3xl shadow-lg border border-gray-200"
        >
          <Image
            src={Images.MaverickLogo}
            alt="Logo"
            width={180}
            height={100}
            className="
    mb-5 border-0 
    w-[180px]        
    max-md:w-[120px] 
    max-sm:w-[120px] 
  "
          />

          {/* <p className="text-[1.4rem] font-bold text-black mb-5 xl:mb-3">
            SIGN UP
          </p> */}

          <form onSubmit={formik.handleSubmit} className="w-full space-y-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-5 gap-y-2 mb-3">
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
                <span className="text-red-500 text-xs mt-1 mb-1 max-md:mt-[1px] max-md:mb-[0.6px] block">
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
                      if (!date) return formik.setFieldValue("dob", "");

                      const localDate = new Date(
                        date.getTime() - date.getTimezoneOffset() * 60000
                      )
                        .toISOString()
                        .split("T")[0];

                      formik.setFieldValue("dob", localDate);
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
                    popperClassName="z-[999] xl:w-[350px]"
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
                      );
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

                      return (
                        <div className="flex items-center justify-between w-full px-2 py-1">
                          <button
                            type="button"
                            onClick={decreaseMonth}
                            disabled={prevMonthButtonDisabled}
                            className="px-2 rounded hover:bg-gray-100 disabled:opacity-40 text-lg font-semibold"
                          >
                            ‹
                          </button>

                          <div className="flex items-center gap-2">
                            <div className="min-w-[100px]">
                              <Select
                                options={monthOptions}
                                value={monthOptions.find(
                                  (m) => m.value === date.getMonth()
                                )}
                                onChange={(selected) =>
                                  selected && changeMonth(selected.value)
                                }
                                styles={{
                                  control: (base) => ({
                                    ...base,
                                    minHeight: "34px",
                                    fontSize: "0.85rem",
                                  }),
                                  menu: (base) => ({ ...base, zIndex: 9999 }),
                                }}
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                              />
                            </div>

                            <div className="min-w-[80px]">
                              <Select
                                options={yearOptions}
                                value={yearOptions.find(
                                  (y) => y.value === date.getFullYear()
                                )}
                                onChange={(selected) =>
                                  selected && changeYear(selected.value)
                                }
                                styles={{
                                  control: (base) => ({
                                    ...base,
                                    minHeight: "34px",
                                    fontSize: "0.85rem",
                                  }),
                                  menu: (base) => ({ ...base, zIndex: 9999 }),
                                }}
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                              />
                            </div>
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

              {/* Gender */}
              <div>
                <div className="relative">
                  <FaTransgender className="absolute left-3 top-2.5 text-gray-500" />
                  <Select
                    options={gender}
                    name="gender"
                    value={gender.find((t) => t.value === formik.values.gender)}
                    onChange={(opt) =>
                      formik.setFieldValue("gender", opt?.value || "")
                    }
                    onBlur={() => formik.setFieldTouched("gender", true)}
                    styles={{
                      ...customSelectStyles,
                      control: (base, state) => ({
                        ...customSelectStyles.control?.(base, state),
                        height: "34px", // 👈 3/7 Height
                        minHeight: "34px",
                        paddingLeft: "20px", // icon space alignment
                      }),
                    }}
                    // isDisabled={isTeamPreset}
                    placeholder="Gender"
                    className="w-auto"
                  />
                </div>
                <span className="text-red-500 text-xs mt-1 block">
                  {formik.touched.gender && formik.errors.gender
                    ? formik.errors.gender
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
              <div className="col-span-1">
                <div className="relative">
                  <IoIosLink className="absolute left-3 top-2 text-gray-500" />
                  <input
                    type="text"
                    name="referBy"
                    placeholder="Referral ID"
                    value={formik.values.referBy}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    readOnly={isReferByPreset} // only read-only if preset
                    className={`w-full pl-10 pr-4 py-1 rounded-md border border-gray-400 focus:ring-2 focus:ring-gray-200 ${
                      isReferByPreset ? " cursor-not-allowed" : ""
                    }`}
                  />
                </div>
                <span className="text-red-500 text-xs mt-1 block">
                  {formik.touched.referBy && formik.errors.referBy
                    ? formik.errors.referBy
                    : "\u00A0"}
                </span>
              </div>

              {/* Team */}
              <div className="col-span-1">
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
                    isDisabled={isTeamPreset}
                    placeholder="Select Team"
                    className="w-full"
                  />
                </div>
                <span className="text-red-500 text-xs mt-1 block">
                  {formik.touched.team && formik.errors.team
                    ? formik.errors.team
                    : "\u00A0"}
                </span>
              </div>
              {/* PAN Number */}
              <div className="col-span-1 flex flex-col">
                <div className="relative">
                  {/* Verified Badge */}
                  <RiVerifiedBadgeFill
                    className={`absolute right-3 top-2.5 text-green-600 text-xl transition-opacity ${
                      panVerified ? "opacity-100" : "opacity-0"
                    }`}
                  />

                  <input
                    type="text"
                    name="pan"
                    maxLength={10}
                    placeholder="PAN Number (Optional)"
                    value={formik.values.pan || ""}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      formik.setFieldValue("pan", value);
                      setPanVerified(false);

                      if (value.length === 10) checkPanDuplicate(value);
                    }}
                    className="w-full pl-3 pr-24 py-1 rounded-md border border-gray-400 uppercase"
                  />

                  {/* Verify button */}
                  {formik.values.pan?.length === 10 &&
                    !panVerified &&
                    !panChecking && (
                      <button
                        type="button"
                        onClick={verifyPan}
                        className="absolute right-2 top-[3px] text-xs bg-[#106187] text-white px-2 py-[2px] rounded"
                      >
                        Verify
                      </button>
                    )}

                  {/* Checking... */}
                  {panChecking && (
                    <span className="absolute right-3 top-[10px] text-[10px] text-gray-500">
                      Checking...
                    </span>
                  )}
                </div>
              </div>
            </div>

               {/* PAN Note */}
            <p className="text-[0.75rem] text-gray-600 -mt-3 mb-8">
              <strong>Note:</strong> If PAN is verified, TDS will be{" "}
              <strong>2%</strong>. If not verified, TDS will be{" "}
              <strong>20%</strong>.
            </p>

            {/* Terms */}
            <div className="flex items-center space-x-2 ">
              <input
                type="checkbox"
                name="terms"
                checked={formik.values.terms}
                onChange={formik.handleChange}
                className="h-4 w-4 border border-gray-400 rounded bg-white appearance-none cursor-pointer
                 checked:bg-[#106187] checked:border-[#106187] relative checked:before:content-['✔'] checked:before:absolute 
                 checked:before:top-[1px] checked:before:left-1/2 checked:before:-translate-x-1/2 checked:before:text-[0.75rem]
                  checked:before:text-white checked:after:text-white"
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
                  : "bg-gradient-to-r from-[#0C3978] via-[#106187] to-[#16B8E4] text-white cursor-pointer"
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

      {/* Right Illustration
      <div className="w-1/2 max-xl:w-2/5 flex items-center justify-center p-1 max-lg:hidden">
        <DotLottieReact
          src="https://lottie.host/b80db1a0-c452-4ff8-847a-eed370430e0e/DePiYXvQ6y.lottie"
          loop
          autoplay
          style={{ width: "70%", height: "78%" }}
        />
      </div> */}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
