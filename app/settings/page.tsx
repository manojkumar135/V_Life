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
import Loader from "@/components/common/loader";
import { useVLife } from "@/store/context";
import ChangePasswordForm from "@/components/changePasswordForm";
import ShowToast from "@/components/common/Toast/toast";
import { toTitleCase } from "@/utils/convertString";
import InviteForm from "@/components/invite";
import ProfileSection from "@/components/profile";
import OfficeDetails from "@/components/office";

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
    .transform((val) => (val ? val.toLowerCase() : val))
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
  profile: string;
};

const Page = () => {
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleAccordionChange =
    (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [postOfficeData, setPostOfficeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { user } = useVLife();
  // console.log(user, "from profile page");

  // Formik initialization
  const formik = useFormik<FormValues>({
    initialValues: {
      userName: user.user_name || "",
      phone: user.contact || "",
      email: user.mail || "",
      address: user.address || "",
      country: "",
      state: "",
      city: "",
      pincode: user.pincode || "",
      locality: user.locality || "",
      profile: user.profile || "",
    },
    validationSchema: profileSchema,
    onSubmit: async (values) => {
      setLoading(true);

      const formattedValues = {
        ...values,
        userName: toTitleCase(values.userName),
        address: toTitleCase(values.address),
        // locality: toTitleCase(values.locality),
      };

      try {
        const res = await axios.patch("/api/users-operations", {
          user_id: user.user_id, // ✅ important
          ...formattedValues,
        });

        if (res.data.success) {
          ShowToast.success("Profile updated successfully!");
        } else {
          ShowToast.error(res.data.message || "Failed to update profile");
        }
      } catch (error: any) {
        console.error("Error updating profile:", error);
        ShowToast.error(
          error.response?.data?.message || "Failed to update profile"
        );
      } finally {
        setLoading(false);
      }
    },
  });

  // Unified File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      ShowToast.error("Only image files are allowed");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post("/api/getFileUrl", formData);

      if (res.data.success) {
        const imageUrl = res.data.fileUrl;
        formik.setFieldValue("profile", imageUrl);

        // ✅ Trigger the PATCH API call to update user profile with the new image
        await axios.patch("/api/users-operations", {
          user_id: user.user_id,
          profile: imageUrl,
        });

        ShowToast.success("Profile image uploaded successfully!");
      } else {
        ShowToast.error(res.data.message || "Upload failed");
      }
    } catch (err: any) {
      console.error("Error uploading file:", err);
      ShowToast.error(err.response?.data?.message || "Failed to upload file");
    } finally {
      setLoading(false);
    }
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
            setPostOfficeData(postOffices);

            if (postOffices.length) {
              // ✅ Keep user's locality if it's valid, otherwise fallback
              const defaultLocality =
                user.locality &&
                postOffices.some((po: any) => po.Name === user.locality)
                  ? user.locality
                  : postOffices[0].Name;

              formik.setFieldValue("locality", defaultLocality);
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
  }, [formik.values.pincode, user.locality]);

  useEffect(() => {
    if (user.user_name) {
      formik.setValues({
        userName: user.user_name || "",
        phone: user.contact || "",
        email: user.mail || "",
        address: user.address || "",
        country: "",
        state: "",
        city: "",
        pincode: user.pincode || "",
        locality: user.locality || "",
        profile: user.profile || "",
      });
    }
  }, [user]);

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}
      <Layout>
        <div className="px-6 py-3 md:px-6 md:py-10 bg-[#fefefe] min-h-screen -mt-5 max-md:-mt-3">
          {/* Profile Banner - Desktop */}
          <div className="flex flex-row max-md:flex-col justify-between items-center rounded-2xl bg-gradient-to-tl from-gray-600   to-[#16B8E4] max-md:hidden  px-5 py-4 mb-8 relative overflow-hidden shadow-lg">
            <h2 className="text-white text-[2rem] max-md:text-[1.8rem] font-semibold tracking-wide font-[cursive] bottom-0 self-end max-md:hidden">
              {formik.values.userName}

              <span className="ml-2 text-white text-[1.2rem]"></span>
            </h2>
            <div className="relative">
              <Image
                src={formik.values.profile || Images.ProfilePhoto}
                alt="Profile"
                width={100}
                height={100}
                className="w-26 h-26 rounded-full border-4 border-white shadow-md object-cover cursor-pointer"
                onClick={() => setPreviewOpen(true)}
              />
              <button
                className="absolute bottom-1 right-1 bg-black p-1 rounded-full shadow border-[1.5px] border-white cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <FiEdit2 className="text-white text-sm" />
              </button>
            </div>
          </div>

          {/* Profile Image - Mobile */}
          <div className="flex flex-col items-center justify-center md:hidden mb-4 relative">
            <Image
              src={formik.values.profile || Images.ProfilePhoto}
              alt="Profile"
              width={120}
              height={120}
              className="w-30 h-30 rounded-full border-4 border-white shadow-xl object-cover cursor-pointer"
              onClick={() => setPreviewOpen(true)}
            />
            <button
              className="absolute bottom-1 right-2/7 bg-black p-2 rounded-full shadow border-[1.5px] border-white cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <FiEdit2 className="text-white text-sm" />
            </button>
          </div>

          {/* File Upload Input - Only one instance */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileUpload}
          />

          <div className="mb-8">
            <ProfileSection />
          </div>

          {/* Accordion Sections */}
          {(() => {
            const sections: string[] = [];

            if (user?.role === "admin") {
              sections.push("Office Address");
            }

            sections.push(
              "Welcome Letter",
              "Change Password",
              "Invite",
              "Support"
            );

            return sections.map((section) => (
              <Accordion
                key={section}
                expanded={expanded === section}
                onChange={handleAccordionChange(section)}
                className="mb-4 bg-[#f7f7f7] shadow-sm rounded-md"
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography
                    variant="subtitle1"
                    fontSize={expanded === section ? "1.2rem" : "1rem"}
                    fontWeight={expanded === section ? "bold" : "normal"}
                    className="text-base"
                  >
                    {section}
                  </Typography>
                </AccordionSummary>

                <AccordionDetails>
                  {section === "Office Address" && <OfficeDetails />}
                  {section === "Welcome Letter" && (
                    <p className="text-gray-600 text-sm">
                      To view welcome letter,&nbsp;&nbsp;
                      <a
                        href="/welcomeletter"
                        className="text-blue-600 font-medium hover:underline text-md max-md:text-md"
                      >
                        CLICK HERE
                      </a>
                      .
                    </p>
                  )}
                  {section === "Change Password" && (
                    <ChangePasswordForm onSuccess={() => setExpanded(false)} />
                  )}
                  {section === "Invite" && <InviteForm />}
                  {section === "Support" && (
                    <p className="text-gray-600 text-sm">
                      For support, please contact us at{" "}
                      <a
                        href="mailto:maverick@gmail.com"
                        className="text-blue-600 hover:underline"
                      >
                        maverick@gmail.com
                      </a>
                    </p>
                  )}
                </AccordionDetails>
              </Accordion>
            ));
          })()}
        </div>

        {/* Fullscreen Preview */}
        {previewOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center max-md:items-start max-md:pt-30 justify-center"
            onClick={() => setPreviewOpen(false)}
          >
            <div className="w-[70vw] max-md:w-[80vw] max-w-xs aspect-square">
              <Image
                src={formik.values.profile || Images.ProfilePhoto}
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
