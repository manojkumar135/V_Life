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
        login_id: user?.user_id || "xxxxxxxxx",
        // password: user?.password || "xxxxxxxx",
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
              <p className="font-bold">
                To,<br />
                MAVERICK RESOURCES PVT LTD<br />
                ANDHRA PRADESH
              </p>

              <p>
                Welcome to MAVERICK family. Let's start our journey together.
              </p>

              <p>
                <strong className="text-[18px]">
                  Dear Mr. / Mrs. {user?.user_name},
                </strong>
              </p>

              <p>
                Congratulations, we extend our warm welcome to you on behalf of
                MAVERICK Resources Private Limited. We appreciate your
                discretion to be with us and it is a pleasure to have you with
                us in transforming lives of our acquaintances and grow together.
              </p>

              <p className="text-[16px] font-semibold text-black">
                Your associate Login details are as shown below:
              </p>

              <p>
                <strong>Login ID :</strong> {user?.user_id || "xxxxxxxxx"}
                {"   "}
                {/* <strong>Password :</strong> {user?.password || "xxxxxxxx"} */}
              </p>

              <p>
                As has already been manifested to you the benefits and
                privileges of being with MAVERICK, to add to that, we also
                render and strive to create a perfect environment for achieving
                your set goals. We understand that you have an innovative way of
                stroking energies for the better future and enthusiastic in
                building the same.
              </p>

              <p>
                Commitment, Involvement and Perseverance, the three
                pre-requisites to become eligible for every success. Attaining
                & putting these traits into practice is easy here with the
                support rendered by MAVERICK through MAVERICK Nexus & your
                success is assured.
              </p>

              <p>
                WITH BEST WISHES,
                <br />
                <strong>MAVERICK</strong>
                <br />
                www.maverickmoney.in
              </p>

              <div className="pt-6 border-t border-gray-300">
                <p className="text-sm max-md:text-xs">
                  <strong>Maverick Private Limited</strong>
                  <br />
                  No.3, Bellary Road, Yadavananda Building, 2nd Floor, Opp. To
                  Veterinary College,
                  <br />
                  Bengaluru - 560024 <br />
                  Email : info@maverickmoney.in | Toll-Free No : 18002965586
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