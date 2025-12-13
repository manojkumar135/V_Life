"use client";

import Image from "next/image";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { FiDownload } from "react-icons/fi";
import Layout from "@/layout/Layout";
import { useVLife } from "@/store/context";
import { pdf } from "@react-pdf/renderer";
import WelcomePDF from "@/components/PDF/welcome";
import Loader from "@/components/common/loader";
import { IoIosArrowBack } from "react-icons/io";

export default function WelcomeLetter() {
  const { user } = useVLife();
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleDownload = async () => {
    try {
      setLoading(true); // ✅ show loader

      const data = {
        user_name: user?.user_name || "Member",
      };

      const blob = await pdf(<WelcomePDF data={data} />).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `welcome-letter-${user.user_id}.pdf`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download welcome PDF", error);
    } finally {
      setLoading(false); // ✅ hide loader
    }
  };

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div className="min-h-screen w-full relative bg-transparent">
        <div
          className="fixed lg:absolute  max-md:top-23 max-md:left-5 top-4 left-5   flex items-center gap-2 cursor-pointer z-30"
          onClick={() => router.push("/settings")}
          title="Go Back"
        >
          <IoIosArrowBack size={28} className="text-black max-sm:text-white max-sm:border-white max-sm:rounded-full max-sm:border-2" />
          {/* <p className="font-semibold text-black">Back</p> */}
        </div>

        {/* FIXED Download Button (Bottom Right) */}
        <div className="fixed bottom-10 right-10 max-md:right-5 z-10">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-[#0C3978]
            text-white px-3 py-3 rounded-full shadow-md transition cursor-pointer"
          >
            <FiDownload size={22} />
          </button>
        </div>

        {/* Page Content */}
        <div className="pt-5 pb-8 px-4 max-md:px-2">
          <div
            className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg p-10 max-md:p-4 relative"
            style={{
              backgroundImage:
                "url('https://res.cloudinary.com/dtb4vozhy/image/upload/v1765538939/ChatGPT_Image_Dec_12_2025_04_58_15_PM_ezevkm.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* Logo + Title */}
            <div className="text-center mb-6 max-md:mb-5">
              <Image
                src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1764400245/maverick-logo_sddrui.png"
                alt="Maverick Logo"
                width={180}
                height={100}
                className="mx-auto 
                  w-[140px]       
                  sm:w-[150px]     
                  md:w-[180px]    
                  h-auto
                "
              />
              <p className="text-md lg:text-2xl font-bold text-black mt-6 max-md:mt-1 mb-4 font-sans">
                WELCOME TO MAVERICK
              </p>
            </div>

            {/* Letter Content */}
            <div className="text-gray-900 leading-relaxed space-y-4 max-md:text-[12px] text-[14px]  px-5 max-md:px-1">
              <p>
                <strong className="text-[18px]">Dear {user?.user_name},</strong>
              </p>

              <p>
                As an Associate, welcome to the Maverick Family! We at Maverick
                adhere to the timeless ideas of wellbeing and health. Our goal
                is to make sure that everyone puts their health first and
                aspires to achievement, progress, and prosperity. According to
                the Atharva Veda, success is largely dependent on one’s state of
                health.
              </p>

              <p>
                As an important part of the Maverick family, you will have the
                chance to grow financially for the rest of your life by
                endorsing and utilizing our premium health and wellness
                supplements.
              </p>

              <p className="text-[16px] font-semibold text-black">
                Our Commitment to Quality :
              </p>

              <p>
                Maverick is well known for manufacturing Health & Wellness
                Products that are safe, effective, and up to international
                standards.
              </p>

              <p>We are pleased to own a number of quality certificates:</p>

              <p>
                • ISO 9001:2015/HACCP <br />
                • HALAL <br />
                • KOSHER <br />
                • FSSAI <br />• 100% Organic Certified Products
              </p>

              <p className="text-[16px] font-semibold text-black">
                Unique Business Opportunity :
              </p>

              <p>
                Maverick offers a rewarding compensation plan that ensures
                significantly higher returns for our associates.
              </p>

              <p className="text-[16px] font-semibold text-black">
                Support and Feedback :
              </p>

              <p>
                We assure you that you are in capable hands and encourage you to
                reach out to Maverick leadership for support anytime.
              </p>

              <p>
                For queries, call <strong>18002965586</strong> or email{" "}
                <strong>dcs@maverick.com</strong>.
              </p>

              <p>
                Wish You Success!
                <br />
                <strong>Warm Regards!</strong>
                <br />
                <strong>MAVERICK MANAGEMENT</strong>
              </p>

              <div className="pt-6 border-t border-gray-300">
                <p className="text-sm max-md:text-xs">
                  <strong>Maverick Private Limited</strong>
                  <br />
                  No.3, Bellary Road, Yadavananda Building, 2nd Floor, Opp. To
                  Veterinary College,
                  <br />
                  Bengaluru - 560024 <br />
                  Email : info@maverick.com | Toll-Free No : 18002965586
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 mt-10 pb-6">
          © Copyrights © Maverick Pvt. Ltd. All Rights Reserved.
        </footer>
      </div>
    </Layout>
  );
}
