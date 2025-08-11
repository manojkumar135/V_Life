"use client";
import React, { useState, useRef, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import Layout from "@/layout/Layout";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Image from "next/image";
import Images from "@/constant/Image";
import { FiEdit2 } from "react-icons/fi";
import InputField from "@/components/common/inputtype1";
import SubmitButton from "@/components/common/submitbutton";
import SelectField from "@/components/common/selectinput";
import Loader from "@/components/common/loader";

// Validation Schema
const profileSchema = Yup.object().shape({
  userName: Yup.string()
    .required("Username is required")
    .min(3, "Username must be at least 3 characters"),
  phone: Yup.string()
    .required("Phone number is required")
    .matches(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  address: Yup.string().required("Address is required"),
  country: Yup.string().required("Country is required"),
  state: Yup.string().required("State is required"),
  city: Yup.string().required("City is required"),
  pincode: Yup.string()
    .required("Pincode is required")
    .matches(/^[0-9]{6}$/, "Pincode must be 6 digits"),
  locality: Yup.string().required("Locality is required"),
});

type FormValues = {
  userName: string;
  phone: string;
  email: string;
  address: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  locality: string;
};

const Page = () => {
  const referralLink = "https://VLifeGlobal……………";
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [postOfficeData, setPostOfficeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Formik initialization
  const formik = useFormik<FormValues>({
    initialValues: {
      userName: "",
      phone: "",
      email: "",
      address: "",
      country: "",
      state: "",
      city: "",
      pincode: "",
      locality: "",
    },
    validationSchema: profileSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        console.log("Form submitted:", values);
        // Here you would make your actual API call to save the profile
        // await axios.post('/api/profile', values);
        alert("Profile updated successfully!");
      } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile");
      } finally {
        setLoading(false);
      }
    },
  });

  const localityOptions = postOfficeData.map((item) => ({
    label: item.Name,
    value: item.Name,
  }));

  // Fetch location data based on pincode
useEffect(() => {
  const fetchLocationByPincode = async () => {
    const pincode = formik.values.pincode;

    if (/^\d{6}$/.test(pincode)) {
      setIsLoadingLocation(true);
      try {
        const res = await axios.get(`/api/location-by-pincode?pincode=${pincode}`);
        if (res.data.success) {
          const { city, state, country, postOffices } = res.data.data;
          formik.setFieldValue("city", city);
          formik.setFieldValue("state", state);
          formik.setFieldValue("country", country);
          setPostOfficeData(postOffices);
          if (postOffices.length) {
            formik.setFieldValue("locality", postOffices[0].Name);
          }
        } else {
          clearLocationFields();
        }
      } catch (error) {
        console.error("Error fetching location:", error);
        clearLocationFields();
      } finally {
        setIsLoadingLocation(false);
      }
    }
  };

  const clearLocationFields = () => {
    formik.setFieldValue("city", "");
    formik.setFieldValue("state", "");
    formik.setFieldValue("locality", "");
    setPostOfficeData([]);
  };

  const debounceTimer = setTimeout(fetchLocationByPincode, 800);
  return () => clearTimeout(debounceTimer);
}, [formik.values.pincode]);



  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Referral link copied to clipboard!");
  };

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Loader />
        </div>
      )}
      <Layout>
        <div className="px-6 py-3 md:p-10 bg-[#fefefe] min-h-screen -mt-5 max-md:-mt-3">
          {/* Profile Banner - Desktop */}
          <div className="flex flex-row max-md:flex-col justify-between items-center rounded-2xl bg-gradient-to-r from-gray-700 to-yellow-300 max-md:hidden px-6 py-4 mb-8 relative overflow-hidden shadow-lg">
            <h2 className="text-white text-[2rem] max-md:text-[1.8rem] font-semibold tracking-wide font-[cursive] bottom-0 self-end max-md:hidden">
              Adam Jackson <span className="ml-2 text-white text-[1.2rem]"></span>
            </h2>
            <div className="relative">
              <Image
                src={Images.ProfilePhoto}
                alt="Profile"
                width={100}
                height={100}
                className="w-26 h-26 rounded-full border-4 border-white shadow-md object-cover cursor-pointer"
                onClick={() => setPreviewOpen(true)}
              />
              <button
                className="absolute bottom-1 right-1 bg-black p-1 rounded-full shadow border-[1.5px] border-white"
                onClick={() => fileInputRef.current?.click()}
              >
                <FiEdit2 className="text-white text-sm" />
              </button>
            </div>
          </div>

          {/* Profile Image - Mobile */}
          <div className="flex flex-col items-center justify-center md:hidden mb-4 relative">
            <Image
              src={Images.ProfilePhoto}
              alt="Profile"
              width={120}
              height={120}
              className="w-30 h-30 rounded-full border-4 border-white shadow-xl object-cover cursor-pointer"
              onClick={() => setPreviewOpen(true)}
            />
            <button
              className="absolute bottom-1 right-2/7 bg-black p-2 rounded-full shadow border-[1.5px] border-white"
              onClick={() => fileInputRef.current?.click()}
            >
              <FiEdit2 className="text-white text-sm" />
            </button>
          </div>

          {/* File Upload Input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                console.log("Selected file:", file);
              }
            }}
          />

          {/* Form starts here */}
          <form onSubmit={formik.handleSubmit}>
            {/* Profile Section */}
            <section className="mb-10 mx-5 max-md:mx-0">
              <h3 className="text-xl max-md:text-lg font-bold text-gray-800 mb-5">
                Profile
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <InputField
                  label="User Name"
                  name="userName"
                  type="text"
                  placeholder="User Name"
                  value={formik.values.userName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.userName ? formik.errors.userName : undefined
                  }
                  required
                />
                <InputField
                  label="Contact"
                  name="phone"
                  type="tel"
                  minLength={10}
                  maxLength={10}
                  placeholder="1234567890"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.phone ? formik.errors.phone : undefined}
                  required
                />
                <InputField
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="123@gmail.com"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.email ? formik.errors.email : undefined}
                  required
                />
              </div>
            </section>

            {/* Shipping Section */}
            <section className="mb-10 mx-5 max-md:mx-0">
              <h3 className="text-xl max-md:text-lg font-bold text-gray-800 mb-5">
                Shipping Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <InputField
                  label="Address"
                  name="address"
                  placeholder="D.NO : 123, left street"
                  value={formik.values.address}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.address ? formik.errors.address : undefined
                  }
                  required
                />
                <InputField
                  label="Pincode"
                  name="pincode"
                  placeholder="123456"
                  value={formik.values.pincode}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 6) {
                      formik.handleChange(e);
                    }
                  }}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.pincode ? formik.errors.pincode : undefined
                  }
                  required
                  disabled={isLoadingLocation}
                />
                <InputField
                  label="Country"
                  name="country"
                  placeholder="India"
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
                  placeholder="Uttar Pradesh"
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
                  placeholder="Noida"
                  value={formik.values.city}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.city ? formik.errors.city : undefined}
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
                  error={
                    formik.touched.locality ? formik.errors.locality : undefined
                  }
                  required
                  disabled={isLoadingLocation || postOfficeData.length === 0}
                />
              </div>
            </section>

            {/* Submit Button */}
            <div className="flex justify-end px-5 mb-10">
              <SubmitButton
                type="submit"
                disabled={formik.isSubmitting || isLoadingLocation}
              >
                {formik.isSubmitting ? "Saving..." : "Save Changes"}
              </SubmitButton>
            </div>
          </form>

          {/* Accordion Sections */}
          {[
            "Change Password",
            "Activate / Re-Activate ID",
            "Support",
            "Invite",
            "Refer",
          ].map((section) => (
            <Accordion
              key={section}
              className="mb-4 bg-[#f7f7f7] shadow-sm rounded-md"
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                className="font-semibold text-black px-4"
              >
                <Typography className="text-base">{section}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {section === "Refer" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((_, i) => (
                      <div className="flex gap-2 items-center" key={i}>
                        <input
                          className="modern-input flex-1 text-blue-600 border border-gray-300 rounded px-3 py-2"
                          value={referralLink}
                          readOnly
                        />
                        <button
                          className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-4 py-2 rounded shadow transition-colors duration-200"
                          onClick={() => handleCopy(referralLink)}
                        >
                          Copy Link
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">
                    Content for "{section}" goes here.
                  </p>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </div>

        {/* Fullscreen Preview */}
        {previewOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center max-md:items-start max-md:pt-30 justify-center"
            onClick={() => setPreviewOpen(false)}
          >
            <div className="w-[70vw] max-md:w-[80vw] max-w-xs aspect-square">
              <Image
                src={Images.ProfilePhoto}
                alt="Zoomed Profile"
                width={300}
                height={300}
                className="w-full h-full rounded-full shadow-2xl border-4 border-white object-cover"
              />
            </div>
          </div>
        )}
      </Layout>
    </>
  );
};

export default Page;