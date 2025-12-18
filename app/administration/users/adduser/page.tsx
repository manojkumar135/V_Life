"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter, useSearchParams } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import DateField from "@/components/InputFields/dateField";
import Button from "@/components/common/submitbutton";
import SelectField from "@/components/InputFields/selectinput";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { useVLife } from "@/store/context";
import { RiVerifiedBadgeFill } from "react-icons/ri";

const validationSchema = Yup.object().shape({
  fullName: Yup.string()
    .required("Full Name is required")
    .min(3, "Full Name must be at least 3 characters"),
  email: Yup.string()
    .email("Invalid email address")
    .transform((val) => (val ? val.toLowerCase() : val))
    .required("Email is required"),
  contact: Yup.string()
    .required("Contact is required")
    .matches(/^[0-9]{10}$/, "Contact must be 10 digits"),
  dob: Yup.date()
    .required("Date of Birth is required")
    .max(new Date(), "Date of Birth cannot be in the future") // ✅ prevent upcoming dates
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
  gender: Yup.string().required("Gender is required"),
  pan: Yup.string()
    .trim()
    .max(10, "PAN must be exactly 10 characters")
    .test("valid-pan", "Invalid PAN format (ABCDE1234F)", (value) => {
      if (!value) return true;
      if (value.length < 10) return true;
      return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value);
    })
    .nullable()
    .notRequired(),

  // address: Yup.string().required("Address is required"),
  // city: Yup.string().required("City is required"),
  // state: Yup.string().required("State is required"),
  // country: Yup.string().required("Country is required"),
  // pincode: Yup.string()
  //   .required("Pincode is required")
  //   .matches(/^[0-9]{6}$/, "Pincode must be 6 digits"),
  // locality: Yup.string().required("Locality is required"),
});

function AddUserFormContent() {
  const { user } = useVLife();
  const router = useRouter();
  const [postOfficeData, setPostOfficeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const team = searchParams.get("team") || "right";

  const [panVerified, setPanVerified] = useState(false);
  const [panChecking, setPanChecking] = useState(false);

  const checkPanDuplicate = async (pan: string) => {
    try {
      setPanChecking(true);
      const res = await axios.get(`/api/panfind-operations?pan=${pan}`);

      if (res.data.exists) {
        setPanVerified(false);
        return true; // ❌ exists
      }
      return false; // ✅ available
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setPanChecking(false);
    }
  };

  const verifyPan = async () => {
    try {
      setPanChecking(true);

      const res = await axios.post("/api/pancheck-operations", {
        pan_number: formik.values.pan,
      });

      const panData = res.data?.data?.data;

      if (res.data.success && panData?.status === "valid") {
        setPanVerified(true);
        formik.setFieldValue("pancheck", true); // ✅ IMPORTANT
        ShowToast.success("PAN Verified!");
      } else {
        setPanVerified(false);
        formik.setFieldValue("pancheck", false);
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

  const formik = useFormik({
    initialValues: {
      fullName: "",
      dob: "",
      contact: "",
      alternate: "",

      email: "",
      gender: "",
      bloodGroup: "",
      landmark: "",
      gstNumber: "",

      pan: "",
      pancheck: false,

      address: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
      locality: "",

      nomineeName: "",
      nomineeRelation: "",
      nomineeContact: "",
      nomineeGender: "",
      nomineeDOB: "",
      nomineeAadhar: "",
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setLoading(true);
      try {
        const res = await axios.post("/api/users-operations", {
          user_name: values.fullName,
          dob: values.dob,
          mail: values.email,
          contact: values.contact,
          gender: values.gender,
          blood: values.bloodGroup,
          gst: values.gstNumber,

          pan: values.pan,
          pancheck: values.pancheck,

          address: values.address,
          landmark: values.landmark,

          pincode: values.pincode,
          country: values.country,
          state: values.state,
          district: values.city,
          locality: values.locality,
          created_by: user.user_id,
          role: "user",
          user_status: "inactive",
          referBy: user.user_id,
          team: team || "right",

          nominee_name: values.nomineeName,
          nominee_relation: values.nomineeRelation,
          nominee_contact: values.nomineeContact,
          alternate_contact: values.nomineeContact,
        });

        if (res.data.success) {
          ShowToast.success("User created successfully!");
          router.push("/administration/users");
        } else {
          ShowToast.error(res.data.message || "Failed to create user.");
        }
      } catch (err: any) {
        console.error("Submission error:", err);
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to create user.";
        ShowToast.error(errorMessage);
      } finally {
        setSubmitting(false);
        setLoading(false);
      }
    },
  });

  // Helper to clear location
  const clearLocationFields = () => {
    formik.setFieldValue("city", "");
    formik.setFieldValue("state", "");
    formik.setFieldValue("country", "");
    formik.setFieldValue("locality", "");
    setPostOfficeData([]);
  };

  // Fetch location data based on pincode
  useEffect(() => {
    const fetchLocationByPincode = async () => {
      const pincode = formik.values.pincode;

      if (/^\d{6}$/.test(pincode)) {
        setLoading(true);
        try {
          const res = await axios.get(
            `/api/location-by-pincode?pincode=${pincode}`
          );
          if (res.data.success) {
            const { city, state, country, postOffices } = res.data.data;
            formik.setFieldValue("city", city);
            formik.setFieldValue("state", state);
            formik.setFieldValue("country", country);
            setPostOfficeData(postOffices || []);
            if (postOffices?.length) {
              formik.setFieldValue("locality", postOffices[0].Name);
            }
          } else {
            clearLocationFields();
          }
        } catch (error) {
          console.error("Error fetching location:", error);
          clearLocationFields();
        } finally {
          setLoading(false);
        }
      } else {
        clearLocationFields();
      }
    };

    const debounceTimer = setTimeout(fetchLocationByPincode, 800);
    return () => clearTimeout(debounceTimer);
  }, [formik.values.pincode]);

  const localityOptions = postOfficeData.map((item) => ({
    label: item.Name,
    value: item.Name,
  }));

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center mb-0">
          <IoIosArrowBack
            size={25}
            className="mr-3 cursor-pointer"
            onClick={() => router.push(`/administration/users/${team ?? ""}`)}
          />
          <h2 className="text-xl max-sm:text-[1rem] font-semibold">
            Add New User
          </h2>
        </div>

        {/* Form */}
        <form
          onSubmit={formik.handleSubmit}
          className="rounded-xl p-5 max-sm:p-3 bg-white space-y-4"
        >
          {/* Form Fields */}
          {/* USER DETAILS SECTION */}
          <div className=" rounded-xl p-2  ">
            <p className="text-md font-semibold mb-4 capitalize">
              USER DETAILS
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <InputField
                label="Full Name"
                name="fullName"
                value={formik.values.fullName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.fullName ? formik.errors.fullName : undefined
                }
                required
              />

              <InputField
                label="Email"
                name="email"
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email ? formik.errors.email : undefined}
                required
              />

              <InputField
                label="Contact"
                name="contact"
                value={formik.values.contact}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.contact ? formik.errors.contact : undefined
                }
                required
              />

              <DateField
                label="Date of Birth"
                name="dob"
                value={formik.values.dob}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                min="1900-01-01"
                max={new Date().toISOString().split("T")[0]}
                error={formik.touched.dob ? formik.errors.dob : ""}
                required
              />

              <SelectField
                label="Gender"
                name="gender"
                value={formik.values.gender}
                onChange={(e: any) =>
                  formik.setFieldValue(
                    "gender",
                    e.target?.value || e?.value || ""
                  )
                }
                onBlur={formik.handleBlur}
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "others", label: "Others" },
                ]}
                error={formik.touched.gender ? formik.errors.gender : undefined}
                controlPaddingLeft="0px"
                required
              />

              <SelectField
                label="Blood Group"
                name="bloodGroup"
                value={formik.values.bloodGroup}
                onChange={(e: any) =>
                  formik.setFieldValue(
                    "bloodGroup",
                    e.target?.value || e?.value || ""
                  )
                }
                onBlur={formik.handleBlur}
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
                error={
                  formik.touched.bloodGroup
                    ? formik.errors.bloodGroup
                    : undefined
                }
                controlPaddingLeft="0px"
              />

              <InputField
                label="GST Number"
                name="gstNumber"
                value={formik.values.gstNumber}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.gstNumber ? formik.errors.gstNumber : undefined
                }
              />
            </div>
          </div>

          <div className="rounded-xl p-2">
            <p className="text-md font-semibold mb-4 capitalize">PAN Details</p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* PAN FIELD */}
              <div className="relative w-full">
                {/* INPUT */}
                <InputField
                  label="PAN Number (Optional)"
                  name="pan"
                  value={formik.values.pan}
                  onChange={async (e) => {
                    const value = e.target.value.toUpperCase();
                    formik.setFieldValue("pan", value);
                    setPanVerified(false);
                    formik.setFieldValue("pancheck", false);

                    if (value.length < 10) {
                      formik.setFieldError("pan", "");
                      return;
                    }

                    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value)) {
                      formik.setFieldError(
                        "pan",
                        "* Invalid PAN format (ABCDE1234F)"
                      );
                      return;
                    }

                    const exists = await checkPanDuplicate(value);
                    if (exists) {
                      formik.setFieldError("pan", "* PAN already exists");
                      return;
                    }
                  }}
                  onBlur={formik.handleBlur}
                  error={formik.touched.pan ? formik.errors.pan : undefined}
                  maxLength={10}
                  className="pr-28" // ✅ reserve space inside input
                />

                {/* VERIFY BUTTON */}
                {formik.values.pan.length === 10 &&
                  /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formik.values.pan) &&
                  !panChecking &&
                  !panVerified &&
                  !formik.errors.pan && (
                    <button
                      type="button"
                      onClick={verifyPan}
                      className="
            absolute right-2
           top-[32px]
            bg-[#106187] text-white
            px-3 py-1
            rounded
            h-[26px]
            text-xs
            flex items-center
          "
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
            </div>
          </div>

          {/* PAN Note */}
          <p className="text-[0.75rem] text-red-600 mt-3 mb-5 ml-3">
            <strong className="text-gray-600">Note:</strong> If PAN is verified,
            TDS will be <strong>2%</strong>. If not verified, TDS will be{" "}
            <strong>20%</strong>.
          </p>

          {/* ADDRESS DETAILS SECTION */}
          <div className=" rounded-xl p-2  ">
            <p className="text-md font-semibold mb-4 capitalize">ADDRESS</p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <InputField
                label="D.No & Street"
                name="address"
                value={formik.values.address}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.address ? formik.errors.address : undefined
                }
              />

              <InputField
                label="Landmark"
                name="landmark"
                value={formik.values.landmark}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.landmark ? formik.errors.landmark : undefined
                }
              />

              <InputField
                label="Pincode"
                name="pincode"
                value={formik.values.pincode}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.pincode ? formik.errors.pincode : undefined
                }
                disabled={loading}
              />

              <InputField
                label="Country"
                name="country"
                value={formik.values.country}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.country ? formik.errors.country : undefined
                }
                disabled={loading}
              />

              <InputField
                label="State"
                name="state"
                value={formik.values.state}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.state ? formik.errors.state : undefined}
                disabled={loading}
              />

              <InputField
                label="District"
                name="city"
                value={formik.values.city}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.city ? formik.errors.city : undefined}
                disabled={loading}
              />

              <SelectField
                label="Locality"
                name="locality"
                value={formik.values.locality}
                onChange={(e: any) =>
                  formik.setFieldValue(
                    "locality",
                    e.target?.value || e?.value || ""
                  )
                }
                onBlur={formik.handleBlur}
                options={localityOptions}
                error={
                  formik.touched.locality ? formik.errors.locality : undefined
                }
                disabled={loading || postOfficeData.length === 0}
                controlPaddingLeft="0px"
              />
            </div>
          </div>

          {/* NOMINEE DETAILS SECTION */}
          <div className=" rounded-xl p-2  ">
            <p className="text-md font-semibold mb-4 capitalize">
              NOMINEE DETAILS
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <InputField
                label="Nominee Name (with Surname)"
                name="nomineeName"
                value={formik.values.nomineeName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.nomineeName
                    ? formik.errors.nomineeName
                    : undefined
                }
              />

              <InputField
                label="Nominee Relation"
                name="nomineeRelation"
                value={formik.values.nomineeRelation}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.nomineeRelation
                    ? formik.errors.nomineeRelation
                    : undefined
                }
              />

              <InputField
                label="Alternate Contact"
                name="nomineeContact"
                value={formik.values.nomineeContact}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.nomineeContact
                    ? formik.errors.nomineeContact
                    : undefined
                }
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={formik.isSubmitting || loading}>
              {formik.isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export default function AddNewUserForm() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          <Loader />
        </div>
      }
    >
      <AddUserFormContent />
    </Suspense>
  );
}
