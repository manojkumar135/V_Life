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
import { FaIdCard } from "react-icons/fa";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";

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
  const [referralName, setReferralName] = useState<string | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);

  const [panVerified, setPanVerified] = useState(false);
  const [panChecking, setPanChecking] = useState(false);
  const [panFormatValid, setPanFormatValid] = useState(false); // ✅ NEW
  const [panError, setPanError] = useState(""); // ✅ NEW — race-free PAN error message
  const [showPassword, setShowPassword] = useState(false);

    const [dobDigits, setDobDigits] = useState(""); // raw digits only, up to 8: DDMMYYYY
  const [dobError, setDobError] = useState("");

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

  const today = new Date();
  const maxDob = new Date(
    today.getFullYear() - 17,
    today.getMonth(),
    today.getDate(),
  );

  // Builds the always-10-char mask string, e.g. "11/MM/YYYY" or "11/02/YYYY"
  const maskDob = (digits: string) => {
    const day = digits.slice(0, 2).padEnd(2, "D");
    const month = digits.slice(2, 4).padEnd(2, "M");
    const year = digits.slice(4, 8).padEnd(4, "Y");
    return `${day}/${month}/${year}`;
  };

  const validateDobDigits = (digits: string) => {
    if (digits.length < 8) {
      formik.setFieldValue("dob", "");
      setDobError("");
      return;
    }

    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    const parsed = parseDob(`${day}/${month}/${year}`);

    if (!parsed) {
      formik.setFieldValue("dob", "");
      setDobError("* Invalid date");
      return;
    }
    if (parsed > new Date()) {
      formik.setFieldValue("dob", "");
      setDobError("* Date of Birth cannot be in the future");
      return;
    }
    if (calculateAge(parsed) < 18) {
      formik.setFieldValue("dob", "");
      setDobError("* You must be at least 18 years old");
      return;
    }

    setDobError("");
    const iso = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    formik.setFieldValue("dob", iso);
  };

  const handleDobKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow tab/shift for accessibility; block everything else from default insertion
    if (e.key === "Tab") return;

    if (e.key === "Backspace") {
      e.preventDefault();
      setDobDigits((prev) => {
        const next = prev.slice(0, -1);
        validateDobDigits(next);
        return next;
      });
      return;
    }

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      setDobDigits((prev) => {
        if (prev.length >= 8) return prev;
        const next = prev + e.key;
        validateDobDigits(next);
        return next;
      });
      return;
    }

    // block letters, symbols, paste-triggering keys, etc.
    e.preventDefault();
  };

  const handleDobBlur = () => {
    formik.setFieldTouched("dob", true);
    if (dobDigits.length > 0 && dobDigits.length < 8) {
      setDobError("* Enter a complete date (DD/MM/YYYY)");
    }
  };

  const parseDob = (formatted: string): Date | null => {
    const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  };

  const calculateAge = (birthDate: Date): number => {
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    const dayDiff = now.getDate() - birthDate.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;
    return age;
  };

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
      pancheck: false,
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

          const birthDate = new Date(value);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          const dayDiff = today.getDate() - birthDate.getDate();
          return (
            age > 18 ||
            (age === 18 && (monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0)))
          );
        }),
      referBy: Yup.string()
        .trim()
        .required("* Referral ID is required")
        .matches(
          /^\S{10}$/,
          "* Referral ID must be exactly 10 characters, no spaces",
        ),
      team: Yup.string().required("* Team is required"),
      gender: Yup.string().required("* Gender is required"),
      pan: Yup.string()
        .trim()
        .required("* PAN is required")
        .length(10, "* PAN must be exactly 10 characters")
        .matches(
          /^[A-Z]{5}[0-9]{4}[A-Z]$/,
          "* Invalid PAN format (ABCDE1234F)",
        ),
      pancheck: Yup.boolean()
        .oneOf([true], "* PAN must be verified")
        .required("* PAN must be verified"),
      password: Yup.string()
        .required("* Password is required")
        .min(6, "* Password must be at least 6 characters"),
    }),
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const res = await axios.post("/api/users-operations", values);
        if (res.data.success) {
          ShowToast.success("Registration successful!");
          router.push(
            `/auth/success?username=${encodeURIComponent(
              values.user_name,
            )}&userId=${encodeURIComponent(
              res.data.userId,
            )}&email=${encodeURIComponent(values.mail)}`,
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

  const checkReferralId = async (id: string) => {
    if (id.length !== 10) {
      setReferralName(null);
      return;
    }
    try {
      setReferralChecking(true);
      const res = await axios.get(
        `/api/users-operations?user_id=${id.toUpperCase()}`,
      );
      if (res.data.success && res.data.data?.user_name) {
        setReferralName(res.data.data.user_name);
      } else {
        setReferralName("User not found");
      }
    } catch {
      setReferralName("User not found");
    } finally {
      setReferralChecking(false);
    }
  };

  useEffect(() => {
    if (formik.values.referBy?.length === 10) {
      checkReferralId(formik.values.referBy);
    } else {
      setReferralName(null);
    }
  }, [formik.values.referBy]);

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
          SECRET_KEY,
        ).toString(CryptoJS.enc.Utf8);

        const data = JSON.parse(decrypted);

        if (data.referBy) {
          formik.setFieldValue("referBy", data.referBy.toUpperCase());
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
      formik.setFieldValue("referBy", referBy.toUpperCase());
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

      const res = await axios.get(`/api/panfind-operations?pan=${pan}`);

      if (res.data.exists) {
        setPanVerified(false);
        return true; // PAN EXISTS ❌
      }

      return false; // PAN available ✔
    } catch (err) {
      console.error(err);
      return false;
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
        formik.setFieldValue("pancheck", true); // <-- update formik field
        ShowToast.success("PAN Verified!");
      } else {
        setPanVerified(false);
        formik.setFieldValue("pancheck", false); // <-- update formik field
        ShowToast.error("Invalid PAN Number");
      }
    } catch (err) {
      console.error(err);
      ShowToast.error("PAN verification failed");
      setPanVerified(false);
      formik.setFieldValue("pancheck", false);
    } finally {
      setPanChecking(false);
    }
  };

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleNavigateToLogin = () => router.push("/auth/login");

  return (
    <div className="flex flex-row max-md:flex-col h-screen overflow-hidden max-sm:overflow-y-visible bg-[#106187]/85">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

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
    w-45        
    max-md:w-30 
    max-sm:w-30
  "
          />

          {/* <p className="text-[1.4rem] font-bold text-black mb-5 xl:mb-3">
            SIGN UP
          </p> */}

          {/* Form Section */}
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
                <div className="relative">
                  <IoCalendarOutline className="absolute left-3 top-2 text-gray-500 pointer-events-none z-10" />

                  {/* Overlay: styled display, sits behind the real input */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pl-10 pr-4 py-1 flex items-center font-mono text-base pointer-events-none whitespace-pre"
                  >
                    {maskDob(dobDigits)
                      .split("")
                      .map((ch, i) => (
                        <span
                          key={i}
                          className={
                            /[DMY]/.test(ch) ? "text-gray-400" : "text-black"
                          }
                        >
                          {ch}
                        </span>
                      ))}
                  </div>

                  {/* Real input: transparent text, visible caret, handles all input */}
                  <input
                    type="text"
                    name="dob"
                    inputMode="numeric"
                    value={maskDob(dobDigits)}
                    onKeyDown={handleDobKeyDown}
                    onChange={() => {}}
                    onPaste={(e) => e.preventDefault()}
                    onBlur={handleDobBlur}
                    className={`relative w-full pl-10 pr-4 py-1 rounded-md border font-mono text-base text-transparent caret-black bg-transparent ${
                      dobError || (formik.touched.dob && formik.errors.dob)
                        ? "border-red-500"
                        : "border-gray-400"
                    } focus:ring-2 focus:ring-gray-200`}
                  />
                </div>
                <span className="text-red-500 text-xs mt-1 block">
                  {dobError
                    ? dobError
                    : formik.touched.dob && formik.errors.dob
                      ? formik.errors.dob
                      : "\u00A0"}
                </span>
              </div>

              {/* Gender */}
              <div>
                <div className="relative">
                  <FaTransgender className="absolute left-3 top-2.5 text-gray-500" />
                  {isClient && (
                    <Select
                      options={gender}
                      name="gender"
                      value={gender.find(
                        (t) => t.value === formik.values.gender,
                      )}
                      onChange={(opt) => {
                        formik.setFieldValue("gender", opt?.value || "", true);
                        // formik.setFieldTouched("gender", true);
                      }}
                      onBlur={() => {
                        setTimeout(
                          () => formik.setFieldTouched("gender", true),
                          200,
                        ); // ✅ delayed blur
                      }}
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
                  )}
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
                    inputMode="numeric" // ✅ numeric keyboard on mobile
                    pattern="[0-9]*" // ✅ hints to mobile browsers
                    name="contact"
                    placeholder="Contact Number"
                    value={formik.values.contact}
                    onChange={(e) => {
                      const numeric = e.target.value.replace(/\D/g, ""); // ✅ strip non-digits
                      if (numeric.length <= 10) {
                        // ✅ max 10 digits
                        formik.setFieldValue("contact", numeric);
                      }
                    }}
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
                    maxLength={10}
                    placeholder="Referral ID"
                    value={formik.values.referBy.toUpperCase()}
                    onChange={(e) => {
                      const value = e.target.value
                        .toUpperCase()
                        .replace(/\s/g, "");
                      formik.setFieldValue("referBy", value);
                    }}
                    onBlur={formik.handleBlur}
                    readOnly={isReferByPreset}
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
                {/* Referral name display */}
                {referralChecking && (
                  <p className="text-xs text-gray-400 -mt-3">Checking...</p>
                )}
                {!referralChecking && referralName && (
                  <p
                    className={`text-[12px] -mt-3 flex items-center gap-1 ${
                      referralName === "User not found"
                        ? "text-red-500"
                        : "text-gray-600"
                    }`}
                  >
                    {referralName === "User not found" ? (
                      <>❌ Referral ID not found</>
                    ) : (
                      <>
                        ✓
                        <span>
                          Referred by{" "}
                          <span className="font-semibold text-green-700">
                            {referralName}
                          </span>
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Team */}
              <div className="col-span-1">
                <div className="relative">
                  <FaUsers className="absolute left-3 top-2.5 text-gray-500" />
                  {isClient && (
                    <Select
                      options={teams}
                      name="team"
                      value={teams.find((t) => t.value === formik.values.team)}
                      // Team Select
                      onChange={(opt) => {
                        formik.setFieldValue("team", opt?.value || "");
                        // formik.setFieldTouched("team", true);
                      }}
                      onBlur={() => {
                        setTimeout(
                          () => formik.setFieldTouched("team", true),
                          200,
                        );
                      }}
                      styles={{
                        ...customSelectStyles,
                        control: (base, state) => ({
                          ...customSelectStyles.control?.(base, state),
                          height: "34px", // 👈 3/7 Height
                          minHeight: "34px",
                          paddingLeft: "20px", // icon space alignment
                        }),
                      }}
                      isDisabled={isTeamPreset}
                      placeholder="Select Team"
                      className="w-full"
                    />
                  )}
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
                  {/* Left Icon */}
                  <FaIdCard className="absolute left-3 top-2.5 text-gray-500" />

                  {/* PAN Input */}
                  <input
                    type="text"
                    name="pan"
                    maxLength={10}
                    placeholder="PAN Number"
                    value={formik.values.pan.toUpperCase() || ""}
                    onChange={async (e) => {
                      const value = e.target.value.toUpperCase();

                      formik.setFieldValue("pan", value);
                      setPanVerified(false);
                      setPanFormatValid(false);
                      formik.setFieldValue("pancheck", false);

                      // 👉 0️⃣ Empty → required
                      if (value.length === 0) {
                        setPanError("* PAN is required");
                        return;
                      }

                      // 👉 1️⃣ Typing and < 10 chars → NO ERROR YET
                      if (value.length < 10) {
                        setPanError("");
                        return;
                      }

                      // 👉 2️⃣ > 10 chars (shouldn't normally happen due to maxLength)
                      if (value.length > 10) {
                        setPanError("* PAN must be exactly 10 characters");
                        return;
                      }

                      // 👉 3️⃣ length === 10 but wrong format
                      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value)) {
                        setPanError("* Invalid PAN format (ABCDE1234F)");
                        return;
                      }

                      // 👉 4️⃣ Valid format → clear error & check duplicate
                      setPanError("");

                      const exists = await checkPanDuplicate(value);
                      if (exists) {
                        setPanError("* PAN already exists");
                        return;
                      }

                      setPanFormatValid(true);
                    }}
                    onBlur={(e) => {
                      formik.handleBlur(e);
                      const val = formik.values.pan;
                      if (!val) {
                        setPanError("* PAN is required");
                      } else if (val.length < 10) {
                        setPanError("* PAN must be exactly 10 characters");
                      } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(val)) {
                        setPanError("* Invalid PAN format (ABCDE1234F)");
                      }
                    }}
                    className="w-full pl-10 pr-20 py-1 rounded-md border border-gray-400"
                  />

                  {panFormatValid && !panChecking && !panVerified && (
                    <button
                      type="button"
                      onClick={verifyPan}
                      className="
            absolute right-1 top-1
            bg-[#106187] text-white 
            px-3 rounded 
            h-[26px] flex items-center text-sm cursor-pointer
          "
                    >
                      Verify
                    </button>
                  )}

                  {panChecking && (
                    <span className="absolute right-3 top-[10px] text-[10px] text-gray-500">
                      Checking...
                    </span>
                  )}

                  {panVerified && !panChecking && (
                    <RiVerifiedBadgeFill className="absolute right-3 top-1 text-green-600 text-xl" />
                  )}
                </div>

                {/* PAN Error */}
                <span className="text-red-500 text-xs mt-1 block">
                  {panError
                    ? panError
                    : formik.touched.pan && formik.errors.pan
                      ? formik.errors.pan
                      : (formik.touched.pan || formik.values.pan) &&
                          formik.errors.pancheck
                        ? ` ${formik.errors.pancheck}`
                        : "\u00A0"}
                </span>
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <FaLock className="absolute left-3 top-2 text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full pl-10 pr-10 py-1 rounded-md border border-gray-400 focus:ring-2 focus:ring-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-2 text-gray-500"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <span className="text-red-500 text-xs mt-1 block">
                  {formik.touched.password && formik.errors.password
                    ? formik.errors.password
                    : "\u00A0"}
                </span>
              </div>
            </div>

            {/* PAN Note */}
            {/* <p className="text-[0.75rem] text-red-600 -mt-2 mb-4">
              <strong className="text-gray-600">Note:</strong> If PAN is
              verified, TDS will be <strong>2%</strong>. If not verified, TDS
              will be <strong>20%</strong>.
            </p> */}

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
                !formik.values.terms ||
                !formik.values.pancheck
              }
              className={`w-full py-1 mt-1 font-semibold rounded-md text-[1.2rem] ${
                loading ||
                !formik.isValid ||
                !formik.dirty ||
                !formik.values.terms ||
                !formik.values.pancheck
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-linear-to-r from-[#0C3978] via-[#106187] to-[#16B8E4] text-white cursor-pointer"
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