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

const validationSchema = Yup.object().shape({
  userId: Yup.string().required("User ID is required"),
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
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const formik = useFormik({
    initialValues: {
      userId: "US000003",
      fullName: "User Name",
      email: "123@gmail.com",
      contact: "1234567890",
      address: "India",
      city: "none",
      state: "AN",
      country: "India",
      pincode: "123456",
      locality: "",
    },
    validationSchema,
    onSubmit: (values) => {
      console.log("Submitted Form Data:", values);
      alert("User added successfully!");
    },
  });

  // Fetch location data based on pincode
  useEffect(() => {
    const fetchLocationByPincode = async () => {
      const pincode = formik.values.pincode;
      if (pincode.length === 6) {
        setIsLoadingLocation(true);
        try {
          const res = await axios.get(
            `https://api.postalpincode.in/pincode/${pincode}`
          );

          const data = res.data[0];
          console.log("API Response:", data); // Debug log
          
          if (data.Status === "Success" && data.PostOffice?.length) {
            // Get the first PostOffice entry
            const firstPostOffice = data.PostOffice[0];
            
            formik.setFieldValue("city", firstPostOffice.District || firstPostOffice.Block || "");
            formik.setFieldValue("state", firstPostOffice.State || "");
            formik.setFieldValue("country", firstPostOffice.Country || "India");
            setPostOfficeData(data.PostOffice);
            
            // Auto-select first locality if available
            if (data.PostOffice.length > 0) {
              formik.setFieldValue("locality", data.PostOffice[0].Name);
            }
          } else {
            // Clear fields on failure
            formik.setFieldValue("city", "");
            formik.setFieldValue("state", "");
            formik.setFieldValue("country", "India");
            formik.setFieldValue("locality", "");
            setPostOfficeData([]);
          }
        } catch (error) {
          console.error("Error fetching location data:", error);
          formik.setFieldValue("city", "");
          formik.setFieldValue("state", "");
          formik.setFieldValue("country", "India");
          formik.setFieldValue("locality", "");
          setPostOfficeData([]);
        } finally {
          setIsLoadingLocation(false);
        }
      }
    };

    const debounceTimer = setTimeout(() => {
      if (formik.values.pincode.length === 6) {
        fetchLocationByPincode();
      } else if (formik.values.pincode.length === 0) {
        // Clear fields if pincode is empty
        formik.setFieldValue("city", "");
        formik.setFieldValue("state", "");
        formik.setFieldValue("country", "India");
        formik.setFieldValue("locality", "");
        setPostOfficeData([]);
      }
    }, 500);

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
              label="User ID"
              name="userId"
              value={formik.values.userId}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.userId ? formik.errors.userId : undefined}
              required
            />
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
              disabled={isLoadingLocation}
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
              required
              disabled={isLoadingLocation}
            />
            <InputField
              label="State"
              name="state"
              value={formik.values.state}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.state ? formik.errors.state : undefined}
              required
              disabled={isLoadingLocation}
            />
            <InputField
              label="District"
              name="city"
              value={formik.values.city}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              // error={formik.touched.city ? formik.errors.city : undefined}
              required
              disabled={isLoadingLocation}
            />

             <SelectField
              label="Locality"
              name="locality"
              value={formik.values.locality}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              options={localityOptions}
              error={formik.touched.locality ? formik.errors.locality : undefined}
              required
              disabled={isLoadingLocation || postOfficeData.length === 0}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-6">
            <Button 
              type="submit" 
              disabled={formik.isSubmitting || isLoadingLocation}
            >
              {formik.isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}