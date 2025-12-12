"use client";

import Image from "next/image";
import React from "react";
import { FiDownload } from "react-icons/fi";
import Layout from "@/layout/Layout";

export default function WelcomeLetter() {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = "/api/welcome-pdf"; // API route that returns PDF
    link.download = "welcome-letter.pdf";
    link.click();
  };

  return (
    <Layout>
      <div className="min-h-screen w-full relative bg-transparent">
        {/* FIXED Download Button */}
        <div className="fixed top-20 right-6 z-50">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-[#0C3978] hover:bg-[#10509A] text-white px-4 py-2 rounded-md shadow-md transition"
          >
            <FiDownload size={18} />
            Download
          </button>
        </div>

        {/* Scrollable Page Content */}
        <div className="pt-5 pb-10 px-4">
          <div
            className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg p-10 relative"
            style={{
              backgroundImage:
                "url('https://res.cloudinary.com/dtb4vozhy/image/upload/v1765538939/ChatGPT_Image_Dec_12_2025_04_58_15_PM_ezevkm.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* Logo + Title */}
            <div className="text-center mb-6">
              <Image
                src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1764400245/maverick-logo_sddrui.png"
                alt="Maverick Logo"
                width={220}
                height={120}
                className="mx-auto"
              />
              <h1 className="text-2xl font-bold text-[#0C3978] mt-3">
                WELCOME TO MAVERICK
              </h1>
            </div>

            {/* Letter Content */}
            <div className="text-[#002E59] leading-relaxed space-y-4 text-[15px]">
              <p>
                <strong>Dear UMA MOTHUKURI,</strong>
              </p>

              <p>
                As an Associate, welcome to the Victous Lifesciences Family! We
                at Victous Lifesciences adhere to the timeless ideas of
                wellbeing and health. Our goal is to make sure that everyone
                puts their health first and aspires to achievement, progress,
                and prosperity. According to the Atharva Veda, success is
                largely dependent on one’s state of health.
              </p>

              <p>
                As an important part of the Victous Lifesciences family, you
                will have the chance to grow financially for the rest of your
                life by endorsing and utilizing our premium health and wellness
                supplements.
              </p>

              <h2 className="text-lg font-semibold text-[#0C3978]">
                Our Commitment to Quality :
              </h2>

              <p>
                Victous Lifesciences is well known for manufacturing Health &
                Wellness Products that are safe, effective, and up to
                international standards.
              </p>

              <p>
                We are pleased to own a number of quality certificates, such as:
              </p>

              {/* Certification Logos */}
              <div className="flex flex-wrap items-center gap-4 py-2">
                <Image
                  src="/images/cert1.png"
                  width={60}
                  height={60}
                  alt="ISO"
                />
                <Image
                  src="/images/cert2.png"
                  width={60}
                  height={60}
                  alt="HACCP"
                />
                <Image
                  src="/images/cert3.png"
                  width={60}
                  height={60}
                  alt="FSSAI"
                />
                <Image
                  src="/images/cert4.png"
                  width={60}
                  height={60}
                  alt="HALAL"
                />
                <Image
                  src="/images/cert5.png"
                  width={60}
                  height={60}
                  alt="KOSHER"
                />
              </div>

              <p>
                • ISO 9001:2015/HACCP <br />
                • HALAL <br />
                • KOSHER <br />
                • FSSAI <br />• 100% Organic Certified Products
              </p>

              <h2 className="text-lg font-semibold text-[#0C3978]">
                Unique Business Opportunity :
              </h2>

              <p>
                Victous Lifesciences offers a rewarding compensation plan that
                ensures significantly higher returns for our associates.
              </p>

              <h2 className="text-lg font-semibold text-[#0C3978]">
                Support and Feedback :
              </h2>

              <p>
                We assure you that you are in capable hands and encourage you to
                reach out to Victous Lifesciences leadership for support
                anytime.
              </p>

              <p>
                For queries, call <strong>18002965586</strong> or email{" "}
                <strong>dcs@victouslife.com</strong>.
              </p>

              <p>
                Wish You Success!
                <br />
                <strong>Warm Regards!</strong>
                <br />
                <strong>VICTOUS MANAGEMENT</strong>
              </p>

              <div className="pt-6 border-t border-gray-300">
                <p className="text-sm">
                  <strong>Victous Lifesciences Private Limited</strong>
                  <br />
                  No.3, Bellary Road, Yadavananda Building, 2nd Floor, Opp. To
                  Veterinary College,
                  <br />
                  Bengaluru - 560024 <br />
                  Email : info@victouslife.com | Toll-Free No : 18002965586
                </p>
              </div>
            </div>

            <div className="text-right mt-6 text-sm text-gray-600">
              Click here to Download PDF...
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 mt-10 pb-6">
          © Copyrights © Victous Lifesciences Pvt. Ltd. All Rights Reserved.
        </footer>
      </div>
    </Layout>
  );
}
