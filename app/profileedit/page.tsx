"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/layout/Layout";
import axios from "axios";
import { useVLife } from "@/store/context";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import { LuCircleUser } from "react-icons/lu";
import { MdLocationPin } from "react-icons/md";
import { FaClipboardUser } from "react-icons/fa6";
import { RiBankFill } from "react-icons/ri";
import { FaSearch } from "react-icons/fa";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { TbRefresh } from "react-icons/tb";

import InputField from "@/components/InputFields/inputtype1";
import SelectField from "@/components/InputFields/selectinput";
import FileInput from "@/components/InputFields/fileinput";
import SubmitButton from "@/components/common/submitbutton";
import Loader from "@/components/common/loader";
import ShowToast from "@/components/common/Toast/toast";
import DateField from "@/components/InputFields/dateField";
import { RiVerifiedBadgeFill } from "react-icons/ri";

/* ─────────────────────────────────────────────────────────────────────────────
   VALIDATION
   
   Rules:
   • fullName / dob / gender are always required (personal basics).
   • email / contact required only for admin (unchanged from original).
   • ALL KYC / banking fields (scalars + files) are OPTIONAL.
       - If a scalar has a value it must pass the format check.
       - If a file field has a value it must be an image or PDF.
       - If the field is empty / null → no error (admin can save partial data).
   • No .when() cross-references → zero cyclic-dependency risk.
     Cross-field "if any KYC field is filled, the others should be filled too"
     is NOT enforced at schema level; the admin decides what to save.
───────────────────────────────────────────────────────────────────────────── */

/** True when a value is an already-saved S3 URL → counts as "provided" */
const isExistingUrl = (v: any) => typeof v === "string" && v.trim() !== "";

export const ProfileEditSchema = (isAdmin: boolean, panVerified: boolean) =>
  Yup.object().shape({
    /* ── Personal (always required) ── */
    fullName: Yup.string()
      .trim()
      .min(3, "* Full Name must be at least 3 characters")
      .required("* Full Name is required"),

    email: isAdmin
      ? Yup.string()
          .email("* Invalid email address")
          .transform((val) => (val ? val.toLowerCase() : val))
          .required("* Email is required")
      : Yup.string().nullable(),

    contact: isAdmin
      ? Yup.string()
          .matches(/^[0-9]{10}$/, "* Contact must be 10 digits")
          .required("* Contact is required")
      : Yup.string().nullable(),

    dob: Yup.date()
      .required("* Date of Birth is required")
      .max(new Date(), "* Date of Birth cannot be in the future")
      .test("age", "* You must be at least 18 years old", (value) => {
        if (!value) return false;
        const today = new Date();
        const birthDate = new Date(value);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate()))
          age--;
        return age >= 18;
      }),

    gender: Yup.string().required("* Gender is required"),

    /* ── Address / Nominee (all optional, format-checked when present) ── */
    bloodGroup: Yup.string().nullable(),
    address: Yup.string().nullable(),
    landmark: Yup.string().nullable(),
    pincode: Yup.string()
      .nullable()
      .test("pincode-format", "* Pincode must be 6 digits", (v) =>
        !v ? true : /^[0-9]{6}$/.test(v),
      ),
    country: Yup.string().nullable(),
    state: Yup.string().nullable(),
    city: Yup.string().nullable(),
    locality: Yup.string().nullable(),
    nomineeName: Yup.string().nullable(),
    nomineeRelation: Yup.string().nullable(),
    nomineeContact: Yup.string()
      .nullable()
      .test("nomineeContact-format", "* Alternate contact must be 10 digits", (v) =>
        !v ? true : /^[0-9]{10}$/.test(v),
      ),

    /* ── KYC scalars — optional, but validated when present ── */
    accountHolderName: Yup.string().nullable(),

    bankName: Yup.string().nullable(),

    accountNumber: Yup.string()
      .nullable()
      .test("accountNumber-format", "* Account number must be 9–18 digits", (v) =>
        !v ? true : /^\d{9,18}$/.test(v),
      ),

    ifscCode: Yup.string()
      .nullable()
      .test("ifscCode-format", "* Invalid IFSC code", (v) =>
        !v ? true : /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v),
      ),

    aadharNumber: Yup.string()
      .nullable()
      .test("aadharNumber-format", "* Aadhaar must be 12 digits", (v) =>
        !v ? true : /^\d{12}$/.test(v),
      ),

    panNumber: Yup.string()
      .nullable()
      .test("panNumber-format", "* Invalid PAN format (ABCDE1234F)", (v) =>
        !v ? true : /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.trim().toUpperCase()),
      ),

    /* ── File fields — optional, but type-checked when a new file is picked ── */
    cancelledCheque: Yup.mixed<string | File>()
      .nullable()
      .test("cancelledCheque-type", "* Cheque must be an image or PDF", (v) =>
        !v || isExistingUrl(v)
          ? true
          : v instanceof File &&
            ["image/", "application/pdf"].some((t) => v.type.startsWith(t)),
      ),

    aadharFront: Yup.mixed<string | File>()
      .nullable()
      .test("aadharFront-type", "* Aadhaar front must be an image or PDF", (v) =>
        !v || isExistingUrl(v)
          ? true
          : v instanceof File &&
            ["image/", "application/pdf"].some((t) => v.type.startsWith(t)),
      ),

    aadharBack: Yup.mixed<string | File>()
      .nullable()
      .test("aadharBack-type", "* Aadhaar back must be an image or PDF", (v) =>
        !v || isExistingUrl(v)
          ? true
          : v instanceof File &&
            ["image/", "application/pdf"].some((t) => v.type.startsWith(t)),
      ),

    panFile: Yup.mixed<string | File>()
      .nullable()
      .test("panFile-type", "* PAN must be an image or PDF", (v) =>
        !v || isExistingUrl(v)
          ? true
          : v instanceof File &&
            ["image/", "application/pdf"].some((t) => v.type.startsWith(t)),
      ),

    bankBook: Yup.mixed<string | File>()
      .nullable()
      .test("bankBook-type", "* Bank passbook must be an image or PDF", (v) =>
        !v || isExistingUrl(v)
          ? true
          : v instanceof File &&
            ["image/", "application/pdf"].some((t) => v.type.startsWith(t)),
      ),
  });

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────────────────── */

export default function ProfileEditPage() {
  const router = useRouter();
  const { user } = useVLife();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(false);
  const [panVerified, setPanVerified] = useState(false);
  const [panChecking, setPanChecking] = useState(false);
  const [value, setValue] = useState("");
  const [userMeta, setUserMeta] = useState<any>(null);

  /* Tracks the PAN loaded from DB so duplicate-check is skipped when unchanged */
  const [originalPan, setOriginalPan] = useState<string>("");

  const [passkey, setPasskey] = useState<string | null>(null);
  const [passkeyVisible, setPasskeyVisible] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyGenerating, setPasskeyGenerating] = useState(false);

  const [dbValues, setDbValues] = useState<any>(null);
  const [formKey, setFormKey] = useState(0);

  const [initialValues, setInitialValues] = useState<any>({
    userId: "",
    fullName: "",
    email: "",
    contact: "",
    dob: "",
    gender: "",
    bloodGroup: "",
    address: "",
    landmark: "",
    pincode: "",
    country: "",
    state: "",
    city: "",
    locality: "",
    nomineeName: "",
    nomineeRelation: "",
    nomineeContact: "",
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    gstNumber: "",
    panNumber: "",
    panName: "",
    panDob: "",
    panFile: null,
    aadharNumber: "",
    aadharFront: null,
    aadharBack: null,
    cancelledCheque: null,
    bankBook: null,
  });

  useEffect(() => {
    if (dbValues) {
      setInitialValues(dbValues);
      setFormKey((prev) => prev + 1);
    }
  }, [dbValues]);

  useEffect(() => {
    setPasskey(null);
    setPasskeyVisible(false);
  }, [userMeta?.user_id]);

  /* ---------------- PASSKEY HANDLERS (unchanged) ---------------- */

  const handleTogglePasskey = async () => {
    if (!userMeta?.user_id) return;

    if (passkey !== null) {
      setPasskeyVisible((prev) => !prev);
      return;
    }

    try {
      setPasskeyLoading(true);
      const { data } = await axios.get(
        `/api/getuser-operations?search=${userMeta.user_id}&passkey=true`,
      );

      if (data?.success) {
        const key = data.login_key || null;
        setPasskey(key);
        setPasskeyVisible(true);
        if (!key) ShowToast.error("No passkey generated yet. Click Generate.");
      } else {
        ShowToast.error("Could not fetch passkey");
      }
    } catch {
      ShowToast.error("Error fetching passkey");
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleGeneratePasskey = async () => {
    if (!userMeta?.user_id) return;

    try {
      setPasskeyGenerating(true);
      const { data } = await axios.patch("/api/getuser-operations", {
        generatePasskey: { user_id: userMeta.user_id },
      });

      if (data?.success) {
        setPasskey(data.login_key);
        setPasskeyVisible(true);
        ShowToast.success("New passkey generated");
      } else {
        ShowToast.error(data?.message || "Failed to generate passkey");
      }
    } catch {
      ShowToast.error("Error generating passkey");
    } finally {
      setPasskeyGenerating(false);
    }
  };

  /* ---------------- PAN HANDLERS ---------------- */

  const checkPanDuplicate = async (pan: string) => {
    /* Skip duplicate check if the PAN hasn't changed from what was loaded */
    if (pan === originalPan) return false;
    try {
      setPanChecking(true);
      const res = await axios.get(`/api/panfind-operations?pan=${pan}`);
      return res.data?.exists === true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setPanChecking(false);
    }
  };

  const verifyPan = async (pan: string, panName?: string, panDob?: string) => {
    try {
      setPanChecking(true);
      const res = await axios.post("/api/pancheck-operations", {
        pan_number: pan,
        pan_name: panName || undefined,
        pan_dob: panDob || undefined,
      });
      const panData = res.data?.data?.data;
      if (res.data.success && panData?.status === "valid") {
        setPanVerified(true);
        ShowToast.success("PAN Verified successfully");
      } else {
        setPanVerified(false);
        ShowToast.error("Invalid PAN Number");
      }
    } catch (err) {
      console.error(err);
      setPanVerified(false);
      ShowToast.error("PAN verification failed");
    } finally {
      setPanChecking(false);
    }
  };

  const handleVerifyPan = async (
    pan: string,
    panName?: string,
    panDob?: string,
  ) => {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      ShowToast.error("Enter a valid PAN before verifying");
      return;
    }
    const exists = await checkPanDuplicate(pan);
    if (exists) {
      ShowToast.error("PAN already exists");
      return;
    }
    await verifyPan(pan, panName, panDob);
  };

  const validatePanField = async (
    pan: string,
    setFieldError: any,
    setPanVerifiedLocal: any,
  ) => {
    setPanVerifiedLocal(false);
    if (!pan) {
      /* PAN is optional — clear any error when field is emptied */
      setFieldError("panNumber", "");
      return;
    }
    if (pan.length < 10) {
      setFieldError("panNumber", "");
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      setFieldError("panNumber", "* Invalid PAN format (ABCDE1234F)");
      return;
    }
    /* Only check duplicate when PAN has changed from DB value */
    if (pan !== originalPan) {
      const exists = await checkPanDuplicate(pan);
      if (exists) {
        setFieldError("panNumber", "* PAN already exists");
        return;
      }
    }
    setFieldError("panNumber", "");
  };

  /* ---------------- S3 FILE UPLOAD HELPER (unchanged) ---------------- */

  const uploadFileToS3 = async (file: File): Promise<string | null> => {
    try {
      const fileForm = new FormData();
      fileForm.append("file", file);
      const res = await axios.post("/api/getFileUrl", fileForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) return res.data.fileUrl as string;
      ShowToast.error(res.data.message || "File upload failed");
      return null;
    } catch (error) {
      console.error("File upload error:", error);
      ShowToast.error("Failed to upload file");
      return null;
    }
  };

  /* ---------------- SEARCH ---------------- */

  const emptyForm = {
    userId: "",
    fullName: "",
    email: "",
    contact: "",
    dob: "",
    gender: "",
    bloodGroup: "",
    address: "",
    landmark: "",
    pincode: "",
    country: "",
    state: "",
    city: "",
    locality: "",
    nomineeName: "",
    nomineeRelation: "",
    nomineeContact: "",
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    gstNumber: "",
    panNumber: "",
    panName: "",
    panDob: "",
    panFile: null,
    aadharNumber: "",
    aadharFront: null,
    aadharBack: null,
    cancelledCheque: null,
    bankBook: null,
  };

  const searchUser = async (q: string) => {
    if (!q) return;

    setLoading(true);
    const startTime = Date.now();

    try {
      const { data } = await axios.get(`/api/getuser-operations?search=${q}`);

      if (!data?.success || !data?.data) {
        ShowToast.error("User not found");
        setUserMeta(null);
        setDbValues(null);
        setOriginalPan("");
        setInitialValues(emptyForm);
        setFormKey((prev) => prev + 1);
        return;
      }

      const u = data.data;
      console.log(u);
      setUserMeta(u);

      const mappedValues = {
        userId: u.user_id,
        fullName: u.user_name || "",
        email: u.mail || "",
        contact: u.contact || "",
        dob: u.dob?.split("T")[0] || "",
        gender: u.gender || "",
        bloodGroup: u.blood || "",
        address: u.address || "",
        landmark: u.landmark || "",
        pincode: u.pincode || "",
        country: u.country || "",
        state: u.state || "",
        city: u.district || "",
        locality: u.locality || "",
        nomineeName: u.nominee_name || "",
        nomineeRelation: u.nominee_relation || "",
        nomineeContact: u.alternate_contact || "",
        accountHolderName: u.account_holder_name || "",
        bankName: u.bank_name || "",
        accountNumber: u.account_number || "",
        ifscCode: u.ifsc_code || "",
        gstNumber: u.gst || "",
        panNumber: u.pan_number || "",
        panName: u.pan_name || "",
        panDob: u.pan_dob || "",
        panFile:
          typeof u.pan_file === "string" && u.pan_file.trim() !== ""
            ? u.pan_file
            : null,
        aadharNumber: u.aadhar_number || "",
        aadharFront: u.aadhar_front || null,
        aadharBack: u.aadhar_back || null,
        cancelledCheque: u.cheque || null,
        bankBook: u.bank_book || null,
      };

      setDbValues(mappedValues);
      setInitialValues(mappedValues);
      setOriginalPan(u.pan_number || "");
      setPanVerified(Boolean(u.pan_verified));
    } catch (error) {
      ShowToast.error("User not found");
      setUserMeta(null);
      setPanVerified(false);
      setOriginalPan("");
      setDbValues(null);
      setInitialValues(emptyForm);
      setFormKey((prev) => prev + 1);
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = 2000 - elapsed;
      setTimeout(() => setLoading(false), remaining > 0 ? remaining : 0);
    }
  };

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      // ── Step 1: Upload new File picks to S3, resolve existing URLs ──────
      const fileFields = [
        { formikKey: "bankBook",        dbKey: "bank_book"    },
        { formikKey: "aadharFront",     dbKey: "aadhar_front" },
        { formikKey: "aadharBack",      dbKey: "aadhar_back"  },
        { formikKey: "cancelledCheque", dbKey: "cheque"       },
        { formikKey: "panFile",         dbKey: "pan_file"     },
      ] as const;

      const resolvedUrls: Record<string, string> = {};

      for (const { formikKey, dbKey } of fileFields) {
        const val = values[formikKey];

        if (val instanceof File) {
          const url = await uploadFileToS3(val);
          if (!url) {
            setLoading(false);
            return;
          }
          resolvedUrls[dbKey] = url;
        } else if (typeof val === "string" && val.trim() !== "") {
          // Existing S3 URL — keep as-is
          resolvedUrls[dbKey] = val;
        }
        // null / undefined → omit; DB retains its current value
      }

      // ── Step 2: Build userUpdates — only non-empty scalar fields ────────
      const userScalars: Record<string, any> = {
        user_name:         values.fullName,
        mail:              values.email,
        contact:           values.contact,
        dob:               values.dob,
        gender:            values.gender,
        blood:             values.bloodGroup,
        address:           values.address,
        landmark:          values.landmark,
        pincode:           values.pincode,
        country:           values.country,
        state:             values.state,
        district:          values.city,
        locality:          values.locality,
        nominee_name:      values.nomineeName,
        nominee_relation:  values.nomineeRelation,
        alternate_contact: values.nomineeContact,
      };

      const userUpdates: Record<string, any> = {};
      for (const [k, v] of Object.entries(userScalars)) {
        if (v !== null && v !== undefined && v !== "") userUpdates[k] = v;
      }

      // ── Step 3: Build walletUpdates — only non-empty scalars + resolved URLs
      //   Omit any field that is empty so the DB never gets blanked.
      const walletScalars: Record<string, any> = {
        user_name:           values.fullName,
        contact:             values.contact,
        account_holder_name: values.accountHolderName,
        bank_name:           values.bankName,
        account_number:      values.accountNumber,
        ifsc_code:           values.ifscCode,
        aadhar_number:       values.aadharNumber,
        pan_number:          values.panNumber,
        pan_name:            values.panName,
        pan_dob:             values.panDob,
      };

      const walletUpdates: Record<string, any> = {};
      for (const [k, v] of Object.entries(walletScalars)) {
        if (v !== null && v !== undefined && v !== "") walletUpdates[k] = v;
      }

      // Include pan_verified whenever any wallet data is being saved
      if (
        Object.keys(walletUpdates).length > 0 ||
        Object.keys(resolvedUrls).length > 0
      ) {
        walletUpdates.pan_verified = panVerified;
      }

      // Merge resolved file URLs into walletUpdates
      Object.assign(walletUpdates, resolvedUrls);

      // ── Step 4: Send as plain JSON ───────────────────────────────────────
      const res = await axios.patch("/api/getuser-operations", {
        user_id:      values.userId,
        userUpdates,
        walletUpdates,
      });

      if (res.data.success) {
        ShowToast.success("Profile updated successfully");
        searchUser(values.userId);
      } else {
        ShowToast.error("Update failed");
      }
    } catch (error: any) {
      ShowToast.error(error?.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!value.trim()) {
      ShowToast.error("Please enter User ID");
      return;
    }
    searchUser(value.trim());
  };

  /* ---------------- RENDER (unchanged) ---------------- */

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center backdrop-blur-sm">
          <Loader />
        </div>
      )}

      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white px-4 py-2 mb-1 shadow-[0_6px_12px_-4px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-3 pb-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <IoIosArrowBack
              size={22}
              className="cursor-pointer"
              onClick={() => router.back()}
            />
            <p className="text-md font-semibold">Edit Profile</p>
          </div>
          <div className="md:w-[380px] flex items-center gap-2">
            <div className="relative flex-1">
              <FaSearch
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by User ID ..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full h-8 pl-9 pr-4 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              onClick={handleSearch}
              className="h-8 px-4 max-lg:px-2 rounded-lg bg-[#106187] text-white font-semibold hover:bg-[#0e5676] transition flex items-center justify-center"
            >
              <span className="hidden lg:block text-sm">Search</span>
              <FaSearch className="block lg:hidden" size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-100 min-h-screen max-md:px-1.5 pt-4 mb-5">
        <Formik
          key={formKey}
          enableReinitialize
          initialValues={initialValues}
          validationSchema={ProfileEditSchema(isAdmin, panVerified)}
          validateOnChange={false}
          validateOnBlur={true}
          onSubmit={handleSubmit}
        >
          {({
            values,
            errors,
            touched,
            setFieldValue,
            setFieldError,
            setFieldTouched,
            handleBlur,
          }) => (
            <Form className="max-w-6xl space-y-6 mx-2 lg:mx-6!">
              {/* BASIC INFO */}
              <Card
                title="Basic Information"
                desc="Personal details"
                icon={<LuCircleUser size={20} />}
                userStatus={userMeta?.user_status}
                statusNotes={userMeta?.status_notes}
              >
                <Grid>
                  <InputField
                    label="User ID"
                    name="userId"
                    value={values.userId}
                    disabled
                    required
                    error={touched.userId ? (errors as any).userId : ""}
                  />
                  <InputField
                    label="Full Name"
                    name="fullName"
                    value={values.fullName}
                    required
                    disabled={!isAdmin}
                    error={touched.fullName ? (errors as any).fullName : ""}
                    onChange={(e) => setFieldValue("fullName", e.target.value)}
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="Email"
                    name="email"
                    value={values.email}
                    required
                    disabled={!isAdmin}
                    error={touched.email ? (errors as any).email : ""}
                    onChange={(e) => setFieldValue("email", e.target.value)}
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="Contact"
                    name="contact"
                    value={values.contact}
                    required
                    disabled={!isAdmin}
                    error={touched.contact ? (errors as any).contact : ""}
                    onChange={(e) => setFieldValue("contact", e.target.value)}
                    onBlur={handleBlur}
                  />
                  <DateField
                    label="DOB"
                    name="dob"
                    value={values.dob}
                    required
                    disabled={!isAdmin}
                    error={touched.dob ? (errors as any).dob : ""}
                    onChange={(e: any) => setFieldValue("dob", e.target.value)}
                    onBlur={handleBlur}
                  />
                  <SelectField
                    label="Gender"
                    name="gender"
                    required
                    value={values.gender}
                    disabled={!isAdmin}
                    error={touched.gender ? (errors as any).gender : ""}
                    options={[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "others", label: "Others" },
                    ]}
                    onChange={(option: any) =>
                      setFieldValue("gender", option?.value || "")
                    }
                    onBlur={handleBlur}
                  />
                  <SelectField
                    label="Blood Group"
                    name="bloodGroup"
                    value={values.bloodGroup}
                    disabled={!isAdmin}
                    error={touched.bloodGroup ? (errors as any).bloodGroup : ""}
                    onChange={(e: any) =>
                      setFieldValue("bloodGroup", e.target?.value || e.value)
                    }
                    onBlur={handleBlur}
                    options={[
                      { value: "A+", label: "A+" },
                      { value: "A-", label: "A-" },
                      { value: "B+", label: "B+" },
                      { value: "B-", label: "B-" },
                      { value: "O+", label: "O+" },
                      { value: "O-", label: "O-" },
                      { value: "AB+", label: "AB+" },
                      { value: "AB-", label: "AB-" },
                    ]}
                  />

                  {/* Passkey field — admin only */}
                  {isAdmin && values.userId && (
                    <div className="flex flex-col gap-1 -mb-3 w-full">
                      <label className="text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700">
                        Login Passkey
                        <span className="text-gray-400 font-normal ml-1 text-xs">
                          (Admin only)
                        </span>
                      </label>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <div className="relative flex items-center flex-1">
                            <input
                              type="text"
                              readOnly
                              value={
                                passkeyLoading
                                  ? "Loading..."
                                  : passkeyVisible && passkey
                                    ? passkey
                                    : passkey === ""
                                      ? "Not generated yet"
                                      : "••••••••••"
                              }
                              style={
                                passkeyVisible && passkey
                                  ? { letterSpacing: "normal" }
                                  : { letterSpacing: "0.18em" }
                              }
                              className="w-full px-4 py-2 border border-gray-400 rounded-lg
                                bg-white text-sm placeholder-gray-400 transition-all
                                cursor-default text-gray-700 pr-10"
                            />
                            <button
                              type="button"
                              onClick={handleTogglePasskey}
                              disabled={passkeyLoading || passkeyGenerating}
                              className="absolute right-3 text-gray-600 hover:text-gray-800
                                cursor-pointer disabled:opacity-40"
                              title={
                                passkeyVisible ? "Hide passkey" : "Show passkey"
                              }
                            >
                              {passkeyVisible && passkey ? (
                                <AiOutlineEyeInvisible size={18} />
                              ) : (
                                <AiOutlineEye size={18} />
                              )}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={handleGeneratePasskey}
                            disabled={passkeyGenerating || passkeyLoading}
                            title="Generate new passkey"
                            className="h-9.5 px-3 rounded-lg bg-[#106187] text-white
                              hover:bg-[#0e5676] transition flex items-center gap-1.5
                              text-xs font-semibold disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            <TbRefresh
                              size={15}
                              className={
                                passkeyGenerating ? "animate-spin" : ""
                              }
                            />
                            {passkeyGenerating ? "Generating..." : "Generate"}
                          </button>
                        </div>
                        <div className="text-xs mt-1 opacity-0 h-4">&nbsp;</div>
                      </div>
                    </div>
                  )}
                </Grid>
              </Card>

              {/* ADDRESS */}
              <Card
                title="Address Details"
                desc="Residential address"
                icon={<MdLocationPin size={28} />}
              >
                <Grid>
                  <InputField
                    label="Address"
                    name="address"
                    value={values.address}
                    error={touched.address ? (errors as any).address : ""}
                    onChange={(e) => setFieldValue("address", e.target.value)}
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="Landmark"
                    name="landmark"
                    value={values.landmark}
                    error={touched.landmark ? (errors as any).landmark : ""}
                    onChange={(e) => setFieldValue("landmark", e.target.value)}
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="Pincode"
                    name="pincode"
                    value={values.pincode}
                    error={touched.pincode ? (errors as any).pincode : ""}
                    onChange={(e) => setFieldValue("pincode", e.target.value)}
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="Country"
                    name="country"
                    value={values.country}
                    disabled
                    error={touched.country ? (errors as any).country : ""}
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="State"
                    name="state"
                    value={values.state}
                    disabled
                    error={touched.state ? (errors as any).state : ""}
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="City"
                    name="city"
                    value={values.city}
                    disabled
                    error={touched.city ? (errors as any).city : ""}
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="Locality"
                    name="locality"
                    value={values.locality}
                    disabled
                    error={touched.locality ? (errors as any).locality : ""}
                    onBlur={handleBlur}
                  />
                </Grid>
              </Card>

              {/* NOMINEE */}
              <Card
                title="Nominee Details"
                desc="Optional nominee information"
                icon={<FaClipboardUser size={28} />}
              >
                <Grid>
                  <InputField
                    label="Nominee Name"
                    name="nomineeName"
                    value={values.nomineeName}
                    error={
                      touched.nomineeName ? (errors as any).nomineeName : ""
                    }
                    onChange={(e) =>
                      setFieldValue("nomineeName", e.target.value)
                    }
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="Relation"
                    name="nomineeRelation"
                    value={values.nomineeRelation}
                    error={
                      touched.nomineeRelation
                        ? (errors as any).nomineeRelation
                        : ""
                    }
                    onChange={(e) =>
                      setFieldValue("nomineeRelation", e.target.value)
                    }
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="Alternate Contact"
                    name="nomineeContact"
                    value={values.nomineeContact}
                    error={
                      touched.nomineeContact
                        ? (errors as any).nomineeContact
                        : ""
                    }
                    onChange={(e) =>
                      setFieldValue("nomineeContact", e.target.value)
                    }
                    onBlur={handleBlur}
                  />
                </Grid>
              </Card>

              {/* KYC & BANKING */}
              <Card
                title="KYC & Banking"
                desc="Identity and bank verification"
                icon={<RiBankFill size={28} />}
                panVerified={userMeta?.pan_verified}
              >
                <Grid>
                  {isAdmin && userMeta?.wallet_id && (
                    <InputField
                      label="Wallet ID"
                      name="walletId"
                      value={userMeta.wallet_id}
                      required
                      disabled
                    />
                  )}
                  <InputField
                    label="Bank Name"
                    name="bankName"
                    value={values.bankName}
                    disabled={!isAdmin}
                    error={touched.bankName ? (errors as any).bankName : ""}
                    onChange={(e) => setFieldValue("bankName", e.target.value)}
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="Account Holder Name"
                    name="accountHolderName"
                    value={values.accountHolderName}
                    disabled={!isAdmin}
                    error={
                      touched.accountHolderName
                        ? (errors as any).accountHolderName
                        : ""
                    }
                    onChange={(e) =>
                      setFieldValue("accountHolderName", e.target.value)
                    }
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="Account Number"
                    name="accountNumber"
                    value={values.accountNumber}
                    disabled={!isAdmin}
                    error={
                      touched.accountNumber ? (errors as any).accountNumber : ""
                    }
                    onChange={(e) =>
                      setFieldValue("accountNumber", e.target.value)
                    }
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="IFSC Code"
                    name="ifscCode"
                    value={values.ifscCode}
                    disabled={!isAdmin}
                    error={touched.ifscCode ? (errors as any).ifscCode : ""}
                    onChange={(e) => setFieldValue("ifscCode", e.target.value)}
                    onBlur={handleBlur}
                  />
                  <FileInput
                    label="Bank Passbook"
                    name="bankBook"
                    value={values.bankBook}
                    error={touched.bankBook ? (errors as any).bankBook : ""}
                    onChange={(e) =>
                      setFieldValue("bankBook", e.currentTarget.files?.[0])
                    }
                    onBlur={handleBlur}
                  />
                  <FileInput
                    label="Cancelled Cheque"
                    name="cancelledCheque"
                    value={values.cancelledCheque}
                    error={
                      touched.cancelledCheque
                        ? (errors as any).cancelledCheque
                        : ""
                    }
                    onChange={(e) =>
                      setFieldValue(
                        "cancelledCheque",
                        e.currentTarget.files?.[0],
                      )
                    }
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="Aadhaar Number"
                    name="aadharNumber"
                    value={values.aadharNumber}
                    error={
                      touched.aadharNumber ? (errors as any).aadharNumber : ""
                    }
                    onChange={(e) =>
                      setFieldValue("aadharNumber", e.target.value)
                    }
                    onBlur={handleBlur}
                  />
                  <FileInput
                    label="Aadhaar Front"
                    name="aadharFront"
                    value={values.aadharFront}
                    error={
                      touched.aadharFront ? (errors as any).aadharFront : ""
                    }
                    onChange={(e) =>
                      setFieldValue("aadharFront", e.currentTarget.files?.[0])
                    }
                    onBlur={handleBlur}
                  />
                  <FileInput
                    label="Aadhaar Back"
                    name="aadharBack"
                    value={values.aadharBack}
                    error={touched.aadharBack ? (errors as any).aadharBack : ""}
                    onChange={(e) =>
                      setFieldValue("aadharBack", e.currentTarget.files?.[0])
                    }
                    onBlur={handleBlur}
                  />

                  {/* PAN FIELD */}
                  <div className="relative w-full">
                    <InputField
                      label="PAN Number"
                      name="panNumber"
                      value={values.panNumber}
                      readOnly={!isAdmin}
                      maxLength={10}
                      error={touched.panNumber ? (errors as any).panNumber : ""}
                      onChange={async (e) => {
                        const pan = e.target.value.toUpperCase();
                        setFieldValue("panNumber", pan);
                        setPanVerified(false);
                        await validatePanField(
                          pan,
                          setFieldError,
                          setPanVerified,
                        );
                      }}
                      onBlur={async () => {
                        setFieldTouched("panNumber", true, true);
                        await validatePanField(
                          values.panNumber,
                          setFieldError,
                          setPanVerified,
                        );
                      }}
                      className="pr-28"
                    />
                    {/* Show Verify button only when PAN is new (changed from DB value) */}
                    {isAdmin &&
                      values.panNumber?.length === 10 &&
                      /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(values.panNumber) &&
                      !panChecking &&
                      !panVerified &&
                      values.panNumber !== originalPan &&
                      !errors.panNumber && (
                        <button
                          type="button"
                          onClick={() =>
                            handleVerifyPan(
                              values.panNumber,
                              values.panName,
                              values.panDob,
                            )
                          }
                          className="absolute right-2 top-[32px] bg-[#106187] text-white px-3 py-1 rounded h-[26px] text-xs"
                        >
                          Verify
                        </button>
                      )}
                    {panChecking && (
                      <span className="absolute right-3 top-[38px] text-[11px] text-gray-500">
                        Checking…
                      </span>
                    )}
                    {panVerified && !panChecking && (
                      <RiVerifiedBadgeFill className="absolute right-3 top-[34px] text-green-600 text-xl" />
                    )}
                  </div>

                  <FileInput
                    label="PAN Document"
                    name="panFile"
                    value={values.panFile}
                    error={touched.panFile ? (errors as any).panFile : ""}
                    onChange={(e) =>
                      setFieldValue("panFile", e.currentTarget.files?.[0])
                    }
                    onBlur={handleBlur}
                  />
                </Grid>
              </Card>

              {isAdmin && values.userId && (
                <div className="flex justify-end">
                  <SubmitButton className="px-10 mb-6" type="submit">
                    Save
                  </SubmitButton>
                </div>
              )}
            </Form>
          )}
        </Formik>
      </div>
    </Layout>
  );
}

/* ---------------- STATUS HELPERS (unchanged) ---------------- */

const getStatusConfig = (user_status?: string, status_notes?: string) => {
  if (!user_status) return null;

  const status = user_status.toLowerCase().trim();
  const notes = status_notes?.toLowerCase().trim();

  if (status === "active" && notes === "activated by admin") {
    return {
      label: "Active",
      color: "bg-orange-100 text-orange-400 border-orange-300",
    };
  }

  if (status === "inactive" && notes === "deactivated by admin") {
    return {
      label: "Inactive",
      color: "bg-gray-200 text-gray-800 border-gray-400",
    };
  }

  if (status === "active") {
    return {
      label: "Active",
      color: "bg-green-100 text-green-700 border-green-300",
    };
  }

  if (status === "inactive") {
    return {
      label: "Inactive",
      color: "bg-red-100 text-red-700 border-red-300",
    };
  }

  return null;
};

const getPanStatusConfig = (pan_verified?: boolean | string) => {
  const verified = pan_verified === true || pan_verified === "true";
  return verified
    ? { label: "Verified", color: "text-green-600" }
    : { label: "Not Verified", color: "text-red-600" };
};

/* ---------------- UI HELPERS (unchanged) ---------------- */

const Card = ({
  title,
  desc,
  icon,
  userStatus,
  statusNotes,
  panVerified,
  children,
}: {
  title: string;
  desc: string;
  icon?: React.ReactNode;
  userStatus?: string;
  statusNotes?: string;
  panVerified?: boolean | string;
  children: React.ReactNode;
}) => {
  const status = getStatusConfig(userStatus, statusNotes);
  const panStatus =
    panVerified !== undefined ? getPanStatusConfig(panVerified) : null;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon && (
              <span className="text-primary text-xl shrink-0">{icon}</span>
            )}
            <div>
              <h3 className="text-md font-semibold leading-snug">{title}</h3>
              <p className="text-xs text-gray-500 leading-snug">{desc}</p>
            </div>
          </div>
          {status && (
            <div className="flex justify-end">
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="text-gray-600">Status :</span>
                <span
                  className={`flex items-center gap-1.5 ${status.color.split(" ").find((c) => c.startsWith("text-"))}`}
                >
                  <span className="w-3 h-3 rounded-full bg-current" />
                  <span className="font-semibold">{status.label}</span>
                </span>
              </div>
            </div>
          )}
          {panStatus && (
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <RiVerifiedBadgeFill className={`${panStatus.color}`} size={14} />
              <span className={`font-semibold ${panStatus.color}`}>
                {panStatus.label}
              </span>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>
);