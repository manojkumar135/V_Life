"use client";

import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import Layout from "@/layout/Layout";
import { IoArrowBackOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import InputField from "@/components/common/inputtype1";
import Button from "@/components/common/submitbutton";
import SelectField from "@/components/common/selectinput";
import ShowToast from "@/components/common/Toast/toast";

const validationSchema = Yup.object().shape({
  fullName: Yup.string()
    .required("Full Name is required")
    .min(3, "Full Name must be at least 3 characters"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  contact: Yup.string()
    .required("Contact is required")
    .matches(/^[0-9]{10}$/, "Contact must be 10 digits"),
  address: Yup.string().required("Address is required"),
  city: Yup.string().required("City is required"),
  state: Yup.string().required("State is required"),
  country: Yup.string().required("Country is required"),
  pincode: Yup.string()
    .required("Pincode is required")
    .matches(/^[0-9]{6}$/, "Pincode must be 6 digits"),
  locality: Yup.string().required("Locality is required"),
});

export default function AddNewUserForm() {
  const router = useRouter();
  const [postOfficeData, setPostOfficeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      fullName: "",
      email: "",
      contact: "",
      address: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
      locality: "",
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const res = await axios.post("/api/users-operations", {
          user_name: values.fullName,
          mail: values.email,
          contact: values.contact,
          address: values.address,
          pincode: values.pincode,
          country: values.country,
          state: values.state,
          district: values.city,
          locality: values.locality,
          created_by: "",
          role: "user",
          user_status: "active",
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
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center mb-0">
          <IoArrowBackOutline
            size={25}
            className="mr-3 cursor-pointer"
            onClick={() => router.push("/administration/users")}
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
              error={formik.touched.contact ? formik.errors.contact : undefined}
              required
            />
            <InputField
              label="Address"
              name="address"
              value={formik.values.address}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.address ? formik.errors.address : undefined}
              required
            />
            <InputField
              label="Pincode"
              name="pincode"
              value={formik.values.pincode}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.pincode ? formik.errors.pincode : undefined}
              required
              disabled={loading}
            />

            <InputField
              label="Country"
              name="country"
              value={formik.values.country}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.country ? formik.errors.country : undefined}
              required
              disabled={loading}
            />
            <InputField
              label="State"
              name="state"
              value={formik.values.state}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.state ? formik.errors.state : undefined}
              required
              disabled={loading}
            />
            <InputField
              label="District"
              name="city"
              value={formik.values.city}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.city ? formik.errors.city : undefined}
              required
              disabled={loading}
            />

            <SelectField
              label="Locality"
              name="locality"
              value={formik.values.locality} // <-- pass string value
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
              required
              disabled={loading || postOfficeData.length === 0}
            />
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
