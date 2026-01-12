"use client";

import React, { useState, useEffect } from "react"; // Add useEffect import
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

import InputField from "@/components/InputFields/inputtype1";
import SelectField from "@/components/InputFields/selectinput";
import FileInput from "@/components/InputFields/fileinput";
import SubmitButton from "@/components/common/submitbutton";
import Loader from "@/components/common/loader";
import ShowToast from "@/components/common/Toast/toast";
import DateField from "@/components/InputFields/dateField";
import { RiVerifiedBadgeFill } from "react-icons/ri";

/* ---------------- VALIDATION ---------------- */

export const ProfileEditSchema = (isAdmin: boolean, panVerified: boolean) =>
  Yup.object().shape({
    /* ---------------- BASIC INFO ---------------- */

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
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age >= 18;
      }),

    gender: Yup.string().required("* Gender is required"),

    bloodGroup: Yup.string().nullable(),

    /* ---------------- ADDRESS ---------------- */

    address: Yup.string().nullable(),
    landmark: Yup.string().nullable(),

    pincode: Yup.string()
      .matches(/^[0-9]{6}$/, "* Pincode must be 6 digits")
      .nullable(),

    country: Yup.string().nullable(),
    state: Yup.string().nullable(),
    city: Yup.string().nullable(),
    locality: Yup.string().nullable(),

    /* ---------------- NOMINEE ---------------- */

    nomineeName: Yup.string().nullable(),
    nomineeRelation: Yup.string().nullable(),

    nomineeContact: Yup.string()
      .matches(/^[0-9]{10}$/, "* Alternate contact must be 10 digits")
      .nullable(),

    /* ---------------- BANK (REQUIRED) ---------------- */

    accountHolderName: Yup.string().required(
      "* Account Holder Name is required"
    ),

    bankName: Yup.string().required("* Bank Name is required"),

    accountNumber: Yup.string()
      .matches(/^\d{9,18}$/, "* Account number must be 9–18 digits")
      .required("* Account Number is required"),

    ifscCode: Yup.string()
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, "* Invalid IFSC code")
      .required("* IFSC Code is required"),

    cancelledCheque: Yup.mixed<string | File>()
      .required("* Cancelled cheque is required")
      .test(
        "fileType-cheque",
        "* Cheque must be an image or PDF",
        (value) =>
          typeof value === "string" ||
          (value instanceof File &&
            ["image/", "application/pdf"].some((t) => value.type.startsWith(t)))
      ),

    /* ---------------- AADHAAR (REQUIRED) ---------------- */

    aadharNumber: Yup.string()
      .matches(/^\d{12}$/, "* Aadhaar must be 12 digits")
      .required("* Aadhaar Number is required"),

    aadharFront: Yup.mixed<string | File>()
      .required("* Aadhaar front is required")
      .test(
        "fileType-aadharFront",
        "* Aadhaar front must be an image or PDF",
        (value) =>
          typeof value === "string" ||
          (value instanceof File &&
            ["image/", "application/pdf"].some((t) => value.type.startsWith(t)))
      ),

    aadharBack: Yup.mixed<string | File>()
      .required("* Aadhaar back is required")
      .test(
        "fileType-aadharBack",
        "* Aadhaar back must be an image or PDF",
        (value) =>
          typeof value === "string" ||
          (value instanceof File &&
            ["image/", "application/pdf"].some((t) => value.type.startsWith(t)))
      ),

    /* ---------------- PAN (CRITICAL FIX) ---------------- */

    panNumber: Yup.string()
      .trim()
      .uppercase()
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "* Invalid PAN format (ABCDE1234F)")
      .required("* PAN Number is required"),

    panFile: Yup.mixed<string | File>()
      .required("* PAN document is required")
      .test(
        "fileType-pan",
        "* PAN must be an image or PDF",
        (value) =>
          typeof value === "string" ||
          (value instanceof File &&
            ["image/", "application/pdf"].some((t) => value.type.startsWith(t)))
      ),
  });

/* ---------------- PAGE ---------------- */

export default function ProfileEditPage() {
  const router = useRouter();
  const { user } = useVLife();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(false);
  const [panVerified, setPanVerified] = useState(false);
  const [panChecking, setPanChecking] = useState(false);
  const [value, setValue] = useState("");
  const [userMeta, setUserMeta] = useState<any>(null);

  // ✅ dbValues stores original backend data
  const [dbValues, setDbValues] = useState<any>(null);

  // ✅ ADD THIS: Form reset key to force Formik remount
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
  });

  // ✅ Auto-reset form when dbValues changes (refresh)
  useEffect(() => {
    if (dbValues) {
      setInitialValues(dbValues);
      // 🔥 CRITICAL: Force Formik to remount when we get new data
      setFormKey((prev) => prev + 1);
    }
  }, [dbValues]);

  const checkPanDuplicate = async (pan: string) => {
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

  const verifyPan = async (pan: string) => {
    try {
      setPanChecking(true);

      const res = await axios.post("/api/pancheck-operations", {
        pan_number: pan,
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

  const handleVerifyPan = async (pan: string) => {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      ShowToast.error("Enter a valid PAN before verifying");
      return;
    }

    const exists = await checkPanDuplicate(pan);
    if (exists) {
      ShowToast.error("PAN already exists");
      return;
    }

    await verifyPan(pan);
  };

  /* ---------------- SEARCH ---------------- */

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
        setInitialValues({
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
        });
        setFormKey((prev) => prev + 1); // 🔥 Reset form
        return;
      }

      const u = data.data;

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
        panFile: u.pan_file || null,

        aadharNumber: u.aadhar_number || "",
        aadharFront: u.aadhar_file || null,
        aadharBack: null,

        cancelledCheque: null,
      };

      // ✅ ALWAYS set dbValues to original backend data
      setDbValues(mappedValues);
      setInitialValues(mappedValues);
      setPanVerified(Boolean(u.pan_verified));
    } catch (error) {
      ShowToast.error("User not found");

      // ✅ Reset BOTH states on error
      setUserMeta(null);
      setPanVerified(false);
      setDbValues(null);

      setInitialValues({
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
      });
      setFormKey((prev) => prev + 1); // 🔥 Reset form
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = 2000 - elapsed;

      setTimeout(
        () => {
          setLoading(false);
        },
        remaining > 0 ? remaining : 0
      );
    }
  };

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async (values: any) => {
    // if (isAdmin && !panVerified) {
    //   ShowToast.error("Please verify PAN before saving");
    //   return;
    // }

    try {
      setLoading(true);

      const userUpdates = {
        user_name: values.fullName,
        mail: values.email,
        contact: values.contact,
        dob: values.dob,
        gender: values.gender,
        blood: values.bloodGroup,

        address: values.address,
        landmark: values.landmark,
        pincode: values.pincode,
        country: values.country,
        state: values.state,
        district: values.city,
        locality: values.locality,

        nominee_name: values.nomineeName,
        nominee_relation: values.nomineeRelation,
        alternate_contact: values.nomineeContact,
      };

      const walletUpdates = {
        user_name: values.fullName,
        contact: values.contact,

        account_holder_name: values.accountHolderName,
        bank_name: values.bankName,
        account_number: values.accountNumber,
        ifsc_code: values.ifscCode,

        aadhar_number: values.aadharNumber,
        pan_number: values.panNumber,
        pan_name: values.panName,
        pan_dob: values.panDob,
        pan_verified: panVerified,
      };

      const res = await axios.patch("/api/getuser-operations", {
        user_id: values.userId,
        userUpdates,
        walletUpdates,
      });

      // ✅ Update dbValues only on successful save
      if (res.data.success) {
        ShowToast.success("Profile updated successfully");

        // 🔥 CRITICAL: Refresh from backend after save
        // This will fetch fresh data and reset the form
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

  /* ---------------- RENDER ---------------- */

  const validatePanField = async (
    pan: string,
    setFieldError: any,
    setPanVerified: any
  ) => {
    setPanVerified(false);

    if (!pan) {
      setFieldError("panNumber", "* PAN Number is required");
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

    const exists = await checkPanDuplicate(pan);
    if (exists) {
      setFieldError("panNumber", "* PAN already exists");
      return;
    }

    // ✅ VALID PAN
    setFieldError("panNumber", "");
  };

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center backdrop-blur-sm">
          <Loader />
        </div>
      )}

      {/* HEADER */}
      <div
        className="sticky top-0 z-40 bg-white px-4 py-2 mb-1
 shadow-[0_6px_12px_-4px_rgba(0,0,0,0.35)]"
      >
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
            {/* INPUT */}
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
                className="w-full h-8 pl-9 pr-4 text-sm border rounded-lg
        focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* BUTTON */}
            <button
              onClick={handleSearch}
              className="h-8 px-4 max-lg:px-2 rounded-lg bg-[#106187]
      text-white font-semibold hover:bg-[#0e5676] transition
      flex items-center justify-center"
            >
              <span className="hidden lg:block text-sm">Search</span>
              <FaSearch className="block lg:hidden" size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-100 min-h-screen max-md:px-1.5 pt-4 mb-5">
        {/* 🔥 KEY CHANGES HERE: Add key prop to Formik to force remount */}
        <Formik
          key={formKey} // 🔥 THIS FORCES FORMIK TO REMOUNT
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
            setFieldTouched, // ✅ ADD THIS
            handleBlur,
          }) => (
            <Form className="max-w-6xl space-y-6 mx-2 lg:!mx-6">
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
                    onChange={(e: any) =>
                      setFieldValue("gender", e.target.value || e.value)
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

              {/* KYC */}
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
                    required
                    disabled={!isAdmin}
                    error={touched.bankName ? (errors as any).bankName : ""}
                    onChange={(e) => setFieldValue("bankName", e.target.value)}
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="Account Holder Name"
                    name="accountHolderName"
                    value={values.accountHolderName}
                    required
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
                    required
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
                    required
                    disabled={!isAdmin}
                    error={touched.ifscCode ? (errors as any).ifscCode : ""}
                    onChange={(e) => setFieldValue("ifscCode", e.target.value)}
                    onBlur={handleBlur}
                  />
                  <FileInput
                    label="Cancelled Cheque"
                    name="cancelledCheque"
                    value={values.cancelledCheque}
                    required
                    error={
                      touched.cancelledCheque
                        ? (errors as any).cancelledCheque
                        : ""
                    }
                    onChange={(e) =>
                      setFieldValue(
                        "cancelledCheque",
                        e.currentTarget.files?.[0]
                      )
                    }
                    onBlur={handleBlur}
                  />
                  <InputField
                    label="Aadhaar Number"
                    name="aadharNumber"
                    value={values.aadharNumber}
                    required
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
                    required
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
                    required
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
                      required
                      value={values.panNumber}
                      readOnly={!isAdmin}
                      maxLength={10}
                      error={touched.panNumber ? (errors as any).panNumber : ""}
                      onChange={async (e) => {
                        const pan = e.target.value.toUpperCase();

                        setFieldValue("panNumber", pan);

                        // 🔥 PAN changed → mark unverified
                        setPanVerified(false);

                        await validatePanField(
                          pan,
                          setFieldError,
                          setPanVerified
                        );
                      }}
                      onBlur={async () => {
                        // 🔥 THIS IS THE FIX
                        setFieldTouched("panNumber", true, true);

                        await validatePanField(
                          values.panNumber,
                          setFieldError,
                          setPanVerified
                        );
                      }}
                      className="pr-28"
                    />

                    {/* VERIFY BUTTON */}
                    {isAdmin &&
                      values.panNumber.length === 10 &&
                      /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(values.panNumber) &&
                      !panChecking &&
                      !panVerified &&
                      !errors.panNumber && (
                        <button
                          type="button"
                          onClick={() => handleVerifyPan(values.panNumber)}
                          className="absolute right-2 top-[32px] bg-[#106187] text-white px-3 py-1 rounded h-[26px] text-xs"
                        >
                          Verify
                        </button>
                      )}

                    {/* CHECKING */}
                    {panChecking && (
                      <span className="absolute right-3 top-[38px] text-[11px] text-gray-500">
                        Checking…
                      </span>
                    )}

                    {/* VERIFIED ICON */}
                    {panVerified && !panChecking && (
                      <RiVerifiedBadgeFill className="absolute right-3 top-[34px] text-green-600 text-xl" />
                    )}
                  </div>

                  <FileInput
                    label="PAN Document"
                    name="panFile"
                    required
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

const getStatusConfig = (user_status?: string, status_notes?: string) => {
  if (!user_status) return null;

  if (user_status === "active" && status_notes !== "Activated by Admin") {
    return {
      label: "Active",
      color: "bg-green-100 text-green-700 border-green-300",
    };
  }

  if (user_status === "inactive" && status_notes !== "Deactivated by Admin") {
    return {
      label: "Inactive",
      color: "bg-red-100 text-red-700 border-red-300",
    };
  }

  if (user_status === "active" && status_notes === "Activated by Admin") {
    return {
      label: "Active",
      color: "bg-orange-100 text-orange-700 border-orange-300",
    };
  }

  if (user_status === "inactive" && status_notes === "Deactivated by Admin") {
    return {
      label: "Inactive",
      color: "bg-gray-200 text-gray-800 border-gray-400",
    };
  }

  return null;
};

const getPanStatusConfig = (pan_verified?: boolean | string) => {
  const verified = pan_verified === true || pan_verified === "true";

  return verified
    ? {
        label: "Verified",
        color: "text-green-600",
      }
    : {
        label: "Not Verified",
        color: "text-red-600",
      };
};

/* ---------------- UI HELPERS ---------------- */

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
          {/* LEFT SIDE */}
          <div className="flex items-start gap-3">
            {icon && (
              <span className="text-primary text-xl flex-shrink-0">{icon}</span>
            )}

            <div>
              <h3 className="text-md font-semibold leading-snug">{title}</h3>
              <p className="text-xs text-gray-500 leading-snug">{desc}</p>
            </div>
          </div>

          {/* RIGHT STATUS */}
          {status && (
            <div className="flex justify-end">
              <div className="flex items-center gap-2 text-xs font-medium">
                {/* LABEL */}
                <span className="text-gray-600">Status :</span>

                {/* DOT + VALUE */}
                <span
                  className={`flex items-center gap-1.5 
        ${status.color.split(" ").find((c) => c.startsWith("text-"))}`}
                >
                  {/* DOT */}
                  <span className="w-3 h-3 rounded-full bg-current" />

                  {/* VALUE */}
                  <span className="font-semibold">{status.label}</span>
                </span>
              </div>
            </div>
          )}

          {/* PAN STATUS */}
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
