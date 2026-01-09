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
      const { data } = await axios.get(`/api/users-operations?search=${q}`);
      if (!data?.data) {
        ShowToast.error("User not found");
        return;
      }

      const u = data.data;

      setInitialValues({
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

        accountHolderName: u.bank?.account_holder_name || "",
        bankName: u.bank?.bank_name || "",
        accountNumber: u.bank?.account_number || "",
        ifscCode: u.bank?.ifsc_code || "",
        gstNumber: u.bank?.gst_number || "",

        panNumber: u.pan?.pan_number || "",
        panName: u.pan?.pan_name || "",
        panDob: u.pan?.pan_dob || "",
        panFile: u.pan?.pan_file || null,

        aadharNumber: u.aadhar?.aadhar_number || "",
        aadharFront: u.aadhar?.aadhar_front || null,
        aadharBack: u.aadhar?.aadhar_back || null,

        cancelledCheque: u.bank?.cheque || null,
      });

      setPanVerified(u.pan?.pan_verified || false);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      const res = await axios.patch("/api/users-operations", {
        user_id: values.userId,

        profile: {
          user_name: values.fullName,
          mail: values.email,
          contact: values.contact,
          dob: values.dob,
          gender: values.gender,
          blood: values.bloodGroup,
        },

        address: {
          address: values.address,
          landmark: values.landmark,
          pincode: values.pincode,
          country: values.country,
          state: values.state,
          district: values.city,
          locality: values.locality,
        },

        nominee: {
          nominee_name: values.nomineeName,
          nominee_relation: values.nomineeRelation,
          alternate_contact: values.nomineeContact,
        },

        bank: {
          account_holder_name: values.accountHolderName,
          bank_name: values.bankName,
          account_number: values.accountNumber,
          ifsc_code: values.ifscCode,
          cheque: values.cancelledCheque,
        },

        pan: {
          pan_number: values.panNumber,
          pan_name: values.panName,
          pan_dob: values.panDob,
          pan_file: values.panFile,
          pan_verified: panVerified,
        },

        aadhar: {
          aadhar_number: values.aadharNumber,
          aadhar_front: values.aadharFront,
          aadhar_back: values.aadharBack,
        },
      });

      res.data.success
        ? ShowToast.success("Profile updated successfully")
        : ShowToast.error("Update failed");
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

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
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

      <div className="bg-slate-100 min-h-screen max-md:px-1.5 pt-5">
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={Schema(isAdmin)}
          onSubmit={handleSubmit}
        >
          {({ values, setFieldValue }) => (
            <Form className="max-w-6xl  space-y-6 mx-2 lg:!mx-10">
              {/* BASIC INFO */}
              <Card
                title="Basic Information"
                desc="Personal details"
                icon={<LuCircleUser size={28} />}
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

/* ---------------- UI HELPERS ---------------- */

const Card = ({
  title,
  desc,
  icon,
  children,
}: {
  title: string;
  desc: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl border shadow-sm p-6">
    <div className="flex items-start gap-3 mb-4">
      {icon && (
        <span className="text-primary text-2xl flex-shrink-0">{icon}</span>
      )}

      <div className="flex flex-col">
        <h3 className="text-md font-semibold leading-tight">{title}</h3>
        <p className="text-[12px] text-gray-500 leading-snug">{desc}</p>
      </div>
    </div>

    {children}
  </div>
);

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>
);
