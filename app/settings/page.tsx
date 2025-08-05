"use client";
import React, { useState, useRef } from "react";
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

const Page = () => {
  const referralLink = "https://VLifeGlobal……………";
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    userName: "",
    phone: "",
    email: "",
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: ""
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
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
            className="w-30 h-30 rounded-full border-4 border-white shadow-xl object-cover cursor-pointer"
            onClick={() => setPreviewOpen(true)}
          />
          <button
            className="absolute bottom-1 right-2/7  bg-black p-2 rounded-full shadow border-[1.5px] border-white"
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
              value={formData.userName}
              onChange={handleInputChange}
            />
            <InputField
              label="Contact"
              name="phone"
              type="text"
              placeholder="1234567890"
              value={formData.phone}
              onChange={handleInputChange}
            />
            <InputField
              label="Email"
              name="email"
              type="email"
              placeholder="123@gmail.com"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>
        </section>

        {/* Shipping Section */}
        <section className="mb-10 mx-5 max-md:mx-0">
          <h3 className="text-xl max-md:text-lg font-bold text-gray-800 mb-5">
            Shipping Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[
              { name: "address", label: "Address", placeholder: "D.NO : 123, left street" },
              { name: "country", label: "Country", placeholder: "India" },
              { name: "state", label: "State", placeholder: "Uttar Pradesh" },
              { name: "city", label: "City", placeholder: "Noida" },
              { name: "pincode", label: "Pincode", placeholder: "123456" },
            ].map(({ name, label, placeholder }) => (
              <InputField
                key={name}
                name={name}
                label={label}
                placeholder={placeholder}
                value={formData[name as keyof typeof formData]}
                onChange={handleInputChange}
              />
            ))}
          </div>
        </section>

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
                        className="modern-input flex-1 text-blue-600"
                        value={referralLink}
                        // readOnly
                      />
                      <button
                        className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-4 py-2 rounded shadow"
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
              className="w-full h-full rounded-full shadow-2xl border-4 border-white object-cover"
            />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Page;
