"use client";
import React from "react";
import Layout from "@/layout/Layout";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Image from "next/image";
import Images from "@/constant/Image";

const Page = () => {
  const referralLink = "https://VLifeGlobal……………";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Layout>
      <div className="px-6 py-3 md:p-10 bg-[#fefefe] min-h-screen -mt-5">
        {/* Profile Banner */}
        <div className="flex justify-between items-center rounded-2xl bg-gradient-to-r from-gray-700 to-yellow-200 px-6 py-4 mb-8 relative overflow-hidden shadow-lg">
          <h2 className="text-white text-[2rem] font-semibold tracking-wide font-[cursive] bottom-0 self-end">
            Adam Jackson <span className="ml-2 text-white text-[1.2rem]"></span>
          </h2>
          <Image
            src={Images.ProfilePhoto}
            alt="Profile"
            className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover"
          />
        </div>

        {/* Profile Section */}
        <section className="mb-10 mx-5">
          <h3 className="text-xl font-bold text-gray-800 mb-5">Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-[0.9rem] font-semibold text-gray-700">
                User Name
              </label>
              <input
                type="text"
                placeholder="User Name"
                className="w-full px-4 py-2 border border-gray-500 rounded-lg bg-white text-sm placeholder-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.9rem] font-semibold text-gray-700">
                Phone
              </label>
              <input
                type="text"
                placeholder="1234567890"
                className="w-full px-4 py-2 border border-gray-500 rounded-lg bg-white text-sm placeholder-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.9rem] font-semibold text-gray-700">
                Email
              </label>
              <input
                type="email"
                placeholder="123@gmail.com"
                className="w-full px-4 py-2 border border-gray-500 rounded-lg bg-white text-sm placeholder-gray-400"
              />
            </div>
          </div>
        </section>

        {/* Shipping Section */}
        <section className="mb-10 mx-5">
          <h3 className="text-xl font-bold text-gray-800 mb-5">
            Shipping Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-[0.9rem] font-semibold text-gray-700">
                Address
              </label>
              <input
                type="text"
                placeholder="D.NO : 123, left street"
                className="w-full px-4 py-2 border border-gray-500 rounded-lg bg-white text-sm placeholder-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.9rem] font-semibold text-gray-700">
                Country
              </label>
              <input
                type="text"
                placeholder="India"
                className="w-full px-4 py-2 border border-gray-500 rounded-lg bg-white text-sm placeholder-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.9rem] font-semibold text-gray-700">
                State
              </label>
              <input
                type="text"
                placeholder="Uttar Pradesh"
                className="w-full px-4 py-2 border border-gray-500 rounded-lg bg-white text-sm placeholder-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.9rem] font-semibold text-gray-700">
                City
              </label>
              <input
                type="text"
                placeholder="Noida"
                className="w-full px-4 py-2 border border-gray-500 rounded-lg bg-white text-sm placeholder-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.9rem] font-semibold text-gray-700">
                Pincode
              </label>
              <input
                type="text"
                placeholder="123456"
                className="w-full px-4 py-2 border border-gray-500 rounded-lg bg-white text-sm placeholder-gray-400"
              />
            </div>
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
                  {/* Left Referral */}
                  <div className="flex gap-2 items-center">
                    <input
                      className="modern-input flex-1 text-blue-600"
                      value={referralLink}
                      readOnly
                    />
                    <button
                      className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-4 py-2 rounded shadow"
                      onClick={() => handleCopy(referralLink)}
                    >
                      Copy Link
                    </button>
                  </div>

                  {/* Right Referral */}
                  <div className="flex gap-2 items-center">
                    <input
                      className="modern-input flex-1  text-blue-600"
                      value={referralLink}
                      readOnly
                    />
                    <button
                      className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-4 py-2 rounded shadow"
                      onClick={() => handleCopy(referralLink)}
                    >
                      Copy Link
                    </button>
                  </div>
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

      {/* Tailwind-based input styling */}
    </Layout>
  );
};

export default Page;
