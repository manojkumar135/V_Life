"use client";

import React, { useState } from "react";
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

const Schema = (isAdmin: boolean) =>
  Yup.object({
    fullName: Yup.string().required("Required"),

    email: isAdmin
      ? Yup.string().email("Invalid email").required("Required")
      : Yup.string(),

    contact: isAdmin
      ? Yup.string()
          .matches(/^[0-9]{10}$/, "10 digits")
          .required("Required")
      : Yup.string(),

    gender: Yup.string().required("Required"),
    dob: Yup.string().required("Required"),

    accountHolderName: Yup.string().required("Required"),
    bankName: Yup.string().required("Required"),
    accountNumber: Yup.string()
      .matches(/^\d{9,18}$/, "9–18 digits")
      .required("Required"),
    ifscCode: Yup.string()
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC")
      .required("Required"),

    panNumber: Yup.string()
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN")
      .required("Required"),
    panName: Yup.string().required("Required"),
    panDob: Yup.string().required("Required"),

    aadharNumber: Yup.string()
      .matches(/^\d{12}$/, "12 digits")
      .required("Required"),
  });

/* ---------------- PAGE ---------------- */

export default function ProfileEditPage() {
  const router = useRouter();
  const { user } = useVLife();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(false);
  const [panVerified, setPanVerified] = useState(false);
  const [value, setValue] = useState("");
  const [userMeta, setUserMeta] = useState<any>(null);

  // console.log(userMeta)

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

  /* ---------------- SEARCH ---------------- */

  const searchUser = async (q: string) => {
    if (!q) return;

    try {
      setLoading(true);

      const { data } = await axios.get(`/api/getuser-operations?search=${q}`);

      if (!data?.data) {
        ShowToast.error("User not found");
        return;
      }

      const u = data.data;

      /* 🔹 SAVE FULL USER OBJECT */
      setUserMeta(u);

      /* 🔹 MAP TO FORMIK */
      setInitialValues({
  userId: u.user_id,
  fullName: u.user_name || "",
  email: u.mail || "",
  contact: u.contact || "",
  dob: u.dob?.split("T")[0] || "",
  gender: u.gender || "",
  bloodGroup: u.blood || "", // ✅ BLOOD FIXED

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

  /* ✅ BANK (FLAT) */
  accountHolderName: u.account_holder_name || "",
  bankName: u.bank_name || "",
  accountNumber: u.account_number || "",
  ifscCode: u.ifsc_code || "",
  gstNumber: u.gst || "",

  /* ✅ PAN (FLAT) */
  panNumber: u.pan_number || "",
  panName: u.pan_name || "",
  panDob: u.pan_dob || "",
  panFile: u.pan_file || null,

  /* ✅ AADHAR (FLAT) */
  aadharNumber: u.aadhar_number || "",
  aadharFront: u.aadhar_file || null,
  aadharBack: null,

  cancelledCheque: null,
});


setPanVerified(Boolean(u.pan_verified));
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SUBMIT ---------------- */

  // const handleSubmit = async (values: any) => {
  //   try {
  //     setLoading(true);

  //     const res = await axios.patch("/api/users-operations", {
  //       user_id: values.userId,

  //       profile: {
  //         user_name: values.fullName,
  //         mail: values.email,
  //         contact: values.contact,
  //         dob: values.dob,
  //         gender: values.gender,
  //         blood: values.bloodGroup,
  //       },

  //       address: {
  //         address: values.address,
  //         landmark: values.landmark,
  //         pincode: values.pincode,
  //         country: values.country,
  //         state: values.state,
  //         district: values.city,
  //         locality: values.locality,
  //       },

  //       nominee: {
  //         nominee_name: values.nomineeName,
  //         nominee_relation: values.nomineeRelation,
  //         alternate_contact: values.nomineeContact,
  //       },

  //       bank: {
  //         account_holder_name: values.accountHolderName,
  //         bank_name: values.bankName,
  //         account_number: values.accountNumber,
  //         ifsc_code: values.ifscCode,
  //         cheque: values.cancelledCheque,
  //       },

  //       pan: {
  //         pan_number: values.panNumber,
  //         pan_name: values.panName,
  //         pan_dob: values.panDob,
  //         pan_file: values.panFile,
  //         pan_verified: panVerified,
  //       },

  //       aadhar: {
  //         aadhar_number: values.aadharNumber,
  //         aadhar_front: values.aadharFront,
  //         aadhar_back: values.aadharBack,
  //       },
  //     });

  //     res.data.success
  //       ? ShowToast.success("Profile updated successfully")
  //       : ShowToast.error("Update failed");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSearch = () => {
    if (!value.trim()) {
      ShowToast.error("Please enter User ID");
      return;
    }
    searchUser(value.trim());
  };

  /* ---------------- RENDER ---------------- */

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

      <div className="bg-slate-100 min-h-screen max-md:px-1.5 pt-4">
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={Schema(isAdmin)}
          onSubmit={handleSubmit}
        >
          {({ values, setFieldValue }) => (
            <Form className="max-w-6xl  space-y-6 mx-2 lg:!mx-6">
              {/* BASIC INFO */}
              <Card
                title="Basic Information"
                desc="Personal details"
                icon={<LuCircleUser size={20} />}
                userStatus={userMeta?.user_status}
                statusNotes={userMeta?.status_notes}
              >
                <Grid>
                  <InputField label="User ID" value={values.userId} disabled />
                  <InputField
                    label="Full Name"
                    value={values.fullName}
                    disabled={!isAdmin}
                    onChange={(e) => setFieldValue("fullName", e.target.value)}
                  />
                  <InputField
                    label="Email"
                    value={values.email}
                    disabled={!isAdmin}
                    onChange={(e) => setFieldValue("email", e.target.value)}
                  />
                  <InputField
                    label="Contact"
                    value={values.contact}
                    disabled={!isAdmin}
                    onChange={(e) => setFieldValue("contact", e.target.value)}
                  />
                  <DateField
                    label="DOB"
                    value={values.dob}
                    disabled={!isAdmin}
                    onChange={(e: any) => setFieldValue("dob", e.target.value)}
                  />
                  <SelectField
                    label="Gender"
                    value={values.gender}
                    disabled={!isAdmin}
                    options={[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "others", label: "Others" },
                    ]}
                    onChange={(e: any) =>
                      setFieldValue("gender", e.target.value || e.value)
                    }
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
                    value={values.address}
                    onChange={(e) => setFieldValue("address", e.target.value)}
                  />
                  <InputField
                    label="Landmark"
                    value={values.landmark}
                    onChange={(e) => setFieldValue("landmark", e.target.value)}
                  />
                  <InputField
                    label="Pincode"
                    value={values.pincode}
                    onChange={(e) => setFieldValue("pincode", e.target.value)}
                  />
                  <InputField label="Country" value={values.country} disabled />
                  <InputField label="State" value={values.state} disabled />
                  <InputField label="City" value={values.city} disabled />
                  <InputField
                    label="Locality"
                    value={values.locality}
                    disabled
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
                    value={values.nomineeName}
                    onChange={(e) =>
                      setFieldValue("nomineeName", e.target.value)
                    }
                  />
                  <InputField
                    label="Relation"
                    value={values.nomineeRelation}
                    onChange={(e) =>
                      setFieldValue("nomineeRelation", e.target.value)
                    }
                  />
                  <InputField
                    label="Alternate Contact"
                    value={values.nomineeContact}
                    onChange={(e) =>
                      setFieldValue("nomineeContact", e.target.value)
                    }
                  />
                </Grid>
              </Card>

              {/* KYC */}
              <Card
                title="KYC & Banking"
                desc="Identity and bank verification"
                icon={<RiBankFill size={28} />}
              >
                <Grid>
                  <InputField
                    label="Aadhaar Number"
                    value={values.aadharNumber}
                    onChange={(e) =>
                      setFieldValue("aadharNumber", e.target.value)
                    }
                  />
                  <FileInput
                    label="Aadhaar Front"
                    value={values.aadharFront}
                    name="aadharFront"
                    onChange={(e) =>
                      setFieldValue("aadharFront", e.currentTarget.files?.[0])
                    }
                  />
                  <FileInput
                    label="Aadhaar Back"
                    name="aadharBack"
                    value={values.aadharBack}
                    onChange={(e) =>
                      setFieldValue("aadharBack", e.currentTarget.files?.[0])
                    }
                  />

                  <InputField
                    label="Account Holder Name"
                    value={values.accountHolderName}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setFieldValue("accountHolderName", e.target.value)
                    }
                  />
                  <InputField
                    label="Bank Name"
                    value={values.bankName}
                    disabled={!isAdmin}
                    onChange={(e) => setFieldValue("bankName", e.target.value)}
                  />
                  <InputField
                    label="Account Number"
                    value={values.accountNumber}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setFieldValue("accountNumber", e.target.value)
                    }
                  />
                  <InputField
                    label="IFSC Code"
                    value={values.ifscCode}
                    disabled={!isAdmin}
                    onChange={(e) => setFieldValue("ifscCode", e.target.value)}
                  />
                  <FileInput
                    label="Cancelled Cheque"
                    value={values.cancelledCheque}
                    name="cancelledCheque"
                    onChange={(e) =>
                      setFieldValue(
                        "cancelledCheque",
                        e.currentTarget.files?.[0]
                      )
                    }
                  />

                  <InputField
                    label="PAN Number"
                    value={values.panNumber}
                    disabled={!isAdmin}
                    onChange={(e) => setFieldValue("panNumber", e.target.value)}
                  />
                  <FileInput
                    label="PAN Document"
                    name="panFile"
                    value={values.panFile}
                    onChange={(e) =>
                      setFieldValue("panFile", e.currentTarget.files?.[0])
                    }
                  />
                </Grid>
              </Card>

              {isAdmin && (
                <div className="flex justify-end">
                  <SubmitButton className="px-10 mb-10" type="submit">
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

/* ---------------- UI HELPERS ---------------- */

const Card = ({
  title,
  desc,
  icon,
  userStatus,
  statusNotes,
  children,
}: {
  title: string;
  desc: string;
  icon?: React.ReactNode;
  userStatus?: string;
  statusNotes?: string;
  children: React.ReactNode;
}) => {
  const status = getStatusConfig(userStatus, statusNotes);

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
        ${status.color
          .split(" ")
          .find((c) => c.startsWith("text-"))}`}
      >
        {/* DOT */}
        <span className="w-3 h-3 rounded-full bg-current" />

        {/* VALUE */}
        <span className="font-semibold">
          {status.label}
        </span>
      </span>
    </div>
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
