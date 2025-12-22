"use client";

import React, { useEffect, useState, useRef } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import InputField from "@/components/InputFields/inputtype1";
import SelectField from "@/components/InputFields/selectinput";
import SubmitButton from "@/components/common/submitbutton";
import Loader from "@/components/common/loader";
import DateField from "@/components/InputFields/dateField";
import ShowToast from "@/components/common/Toast/toast";
import { useVLife } from "@/store/context";
import { toTitleCase } from "@/utils/convertString";

const validationSchema = Yup.object({
  fullName: Yup.string(),
  email: Yup.string().email("Invalid"),
  contact: Yup.string().matches(/^[0-9]{10}$/, "10 digits"),
  gender: Yup.string().required("Required"),
  dob: Yup.string().required("Required"),
});

export default function ProfileSection() {
  const { user } = useVLife();
  const [loading, setLoading] = useState(false);

  const [otpPopup, setOtpPopup] = useState(false);
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const [timer, setTimer] = useState(0);

  const [postOfficeData, setPostOfficeData] = useState<any[]>([]);
  const isAdmin = user?.role === "admin";

  const maskEmail = (email: string) => {
    const [name, domain] = email.split("@");
    return `${name.slice(0, 3)}***@${domain}`;
  };

  const initialValues = {
    fullName: user.user_name || "",
    email: user.mail || "",
    contact: user.contact || "",
    dob: user.dob?.split("T")[0] || "",
    gender: user.gender || "",
    bloodGroup: user.blood || "",
    gstNumber: user.gst || "",
    address: user.address || "",
    landmark: user.landmark || "",
    pincode: user.pincode || "",
    country: user.country || "",
    state: user.state || "",
    city: user.district || "",
    locality: user.locality || "",
    nomineeName: user.nominee_name || "",
    nomineeRelation: user.nominee_relation || "",
    nomineeContact: user.alternate_contact || "",
  };

  const originalRef = useRef(initialValues);

  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: () => {},
  });

  const mapVals = (v: any) => ({
    dob: v.dob,
    gender: v.gender,
    blood: v.bloodGroup,
    gst: v.gstNumber,
    address: toTitleCase(v.address),
    landmark: toTitleCase(v.landmark),
    pincode: v.pincode,
    country: v.country,
    state: v.state,
    district: v.city,
    locality: v.locality,
    nominee_name: toTitleCase(v.nomineeName),
    nominee_relation: v.nomineeRelation,
    alternate_contact: v.nomineeContact,
  });

  const buildPayload = (values: any) => {
    if (isAdmin) {
      return {
        user_id: user.user_id,
        user_name: toTitleCase(values.fullName),
        mail: values.email,
        contact: values.contact,
        ...mapVals(values),
      };
    }
    return {
      user_id: user.user_id,
      ...mapVals(values),
    };
  };

  const updateProfile = async (values: any) => {
    try {
      setLoading(true);
      const res = await axios.patch(
        "/api/users-operations",
        buildPayload(values)
      );
      if (res.data.success) {
        ShowToast.success("Profile Updated");
        originalRef.current = { ...values };
      } else {
        ShowToast.error("Failed to update");
      }
    } finally {
      setLoading(false);
      setOtpPopup(false);
      setOtp(new Array(6).fill(""));
    }
  };

  const handleSaveClick = () => {
    const values = formik.values;
    const original = originalRef.current;

    if (JSON.stringify(values) === JSON.stringify(original)) {
      ShowToast.info("No changes");
      return;
    }

    if (isAdmin) {
      updateProfile(values);
      return;
    }

    setOtpPopup(true);
    sendOtp();
  };

  const sendOtp = async () => {
    try {
      setLoading(true);
      await axios.post("/api/sendOTP", { email: user.mail });
      ShowToast.success("OTP Sent");
      setOtp(new Array(6).fill(""));
      startTimer();
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    setTimer(120);
    const i = setInterval(() => {
      setTimer((s) => {
        if (s <= 1) {
          clearInterval(i);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const verifyOtp = async () => {
    if (otp.join("").length !== 6) return;

    try {
      setLoading(true);

      const res = await axios.post("/api/verifyOTP", {
        email: user.mail,
        otp: otp.join(""),
      });

      if (!res.data.success) {
        ShowToast.error("Invalid OTP");
        return;
      }

      // ✅ OTP verified successfully
      ShowToast.success("OTP Verified");

      // ⏳ keep loader for 2 seconds
      setTimeout(() => {
        updateProfile(formik.values);
      }, 2000);
    } catch {
      ShowToast.error("OTP verification failed");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!/^\d{6}$/.test(formik.values.pincode)) {
      resetLocation();
      return;
    }
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `/api/location-by-pincode?pincode=${formik.values.pincode}`
        );
        if (res.data.success) {
          const { city, state, country, postOffices } = res.data.data;
          formik.setFieldValue("city", city);
          formik.setFieldValue("state", state);
          formik.setFieldValue("country", country);
          setPostOfficeData(postOffices);
          formik.setFieldValue(
            "locality",
            postOffices.length ? postOffices[0].Name : ""
          );
        } else resetLocation();
      } catch {
        resetLocation();
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [formik.values.pincode]);

  const resetLocation = () => {
    setPostOfficeData([]);
    formik.setFieldValue("city", "");
    formik.setFieldValue("state", "");
    formik.setFieldValue("country", "");
    formik.setFieldValue("locality", "");
  };

  const localityOptions = postOfficeData.map((p) => ({
    label: p.Name,
    value: p.Name,
  }));

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  return (
    <div>
      {loading && (
        <div className="fixed inset-0 z-999 bg-black/40 flex justify-center items-center backdrop-blur-sm">
          <Loader />
        </div>
      )}

      {/* FORM */}
      <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
        {/* PROFILE */}
        <div className="px-3 max-md:px-0">
          <p className="font-semibold mb-2">PROFILE DETAILS</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-md:gap-4">
            <InputField
              label="Full Name"
              name="fullName"
              value={formik.values.fullName}
              disabled={!isAdmin}
              onChange={isAdmin ? formik.handleChange : undefined}
              onBlur={isAdmin ? formik.handleBlur : undefined}
              error={
                formik.touched.fullName ? formik.errors.fullName : undefined
              }
            />

            <InputField
              label="Email"
              name="email"
              type="email"
              value={formik.values.email}
              disabled={!isAdmin}
              onChange={isAdmin ? formik.handleChange : undefined}
              onBlur={isAdmin ? formik.handleBlur : undefined}
              error={formik.touched.email ? formik.errors.email : undefined}
            />

            <InputField
              label="Contact"
              name="contact"
              value={formik.values.contact}
              disabled={!isAdmin}
              onChange={isAdmin ? formik.handleChange : undefined}
              onBlur={isAdmin ? formik.handleBlur : undefined}
              error={formik.touched.contact ? formik.errors.contact : undefined}
            />

            <DateField label="Date of Birth" {...formik.getFieldProps("dob")} />
            <SelectField
              label="Gender"
              name="gender"
              value={formik.values.gender}
              onChange={(e: any) =>
                formik.setFieldValue("gender", e.target?.value || e.value)
              }
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "others", label: "Others" },
              ]}
            />
            <SelectField
              label="Blood Group"
              name="bloodGroup"
              value={formik.values.bloodGroup}
              onChange={(e: any) =>
                formik.setFieldValue("bloodGroup", e.target?.value || e.value)
              }
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
          </div>
        </div>

        {/* ADDRESS */}
        <div className="px-3 max-md:px-0">
          <p className="font-semibold mb-3">ADDRESS</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-md:gap-4">
            <InputField
              {...formik.getFieldProps("address")}
              label="D.No & Street"
            />
            <InputField
              {...formik.getFieldProps("landmark")}
              label="Landmark"
            />
            <InputField {...formik.getFieldProps("pincode")} label="Pincode" />

            <InputField
              label="Country"
              disabled
              value={formik.values.country}
            />
            <InputField label="State" disabled value={formik.values.state} />
            <InputField label="District" disabled value={formik.values.city} />

            <SelectField
              label="Locality"
              options={localityOptions}
              value={formik.values.locality}
              disabled={!postOfficeData.length}
              onChange={(e: any) =>
                formik.setFieldValue("locality", e.target?.value || e.value)
              }
            />
          </div>
        </div>

        {/* NOMINEE */}
        <div className="px-3 max-md:px-0">
          <p className="font-semibold mb-3">NOMINEE DETAILS</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-md:gap-4">
            <InputField
              {...formik.getFieldProps("nomineeName")}
              label="Nominee Name (with Surname)"
            />
            <InputField
              {...formik.getFieldProps("nomineeRelation")}
              label="Nominee Relation"
            />
            <InputField
              {...formik.getFieldProps("nomineeContact")}
              label="Alternate Contact"
            />
          </div>
        </div>

        {/* SAVE */}
        <div className="flex justify-end">
          <SubmitButton type="button" onClick={handleSaveClick}>
            Save Changes
          </SubmitButton>
        </div>
      </form>

      {/* OTP UI */}
      {otpPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative bg-white p-7 rounded-xl w-[380px] shadow-xl text-center space-y-4">
            <h2 className="text-xl font-bold">Verify OTP</h2>
            <p className="text-gray-600 text-sm">
              Enter the 6-digit code sent to
              <br />
              <span className="font-semibold">{maskEmail(user.mail)}</span>
            </p>

            {/* OTP Boxes */}
            <div className="flex justify-center gap-2">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    if (el) inputRefs.current[i] = el; // <-- valid ref callback (returns void)
                  }}
                  maxLength={1}
                  inputMode="numeric"
                  className="w-10 h-12 border rounded-lg text-center font-bold text-lg tracking-widest"
                  value={d}
                  onChange={(e) => {
                    if (!/^\d*$/.test(e.target.value)) return; // allow only digits

                    const copy = [...otp];
                    copy[i] = e.target.value;
                    setOtp(copy);

                    // Auto focus next
                    if (e.target.value && i < otp.length - 1) {
                      inputRefs.current[i + 1]?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    // Move backward on backspace
                    if (e.key === "Backspace" && !otp[i] && i > 0) {
                      inputRefs.current[i - 1]?.focus();
                    }
                  }}
                />
              ))}
            </div>

            <SubmitButton
              type="button"
              disabled={otp.join("").length !== 6}
              onClick={verifyOtp}
            >
              Verify OTP
            </SubmitButton>

            {/* Timer */}
            <p className="text-sm text-gray-600">
              {timer > 0 ? (
                <>Resend OTP in {formatTime(timer)}</>
              ) : (
                <button
                  className="text-blue-600 underline"
                  onClick={sendOtp}
                  disabled={loading}
                >
                  Resend OTP
                </button>
              )}
            </p>

            {/* Close X */}
            <button
              onClick={() => {
                setOtpPopup(false);
                setOtp(new Array(6).fill(""));
                setTimer(0);
              }}
              className="absolute top-2 right-3 text-red-600 hover:text-red-600 text-3xl"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
