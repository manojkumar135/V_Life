"use client";

import Link from "next/link";
import Image from "next/image";
import {
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaSquareFacebook,
  FaHouse,
  FaLocationDot,
} from "react-icons/fa6";
import { IoIosMail } from "react-icons/io";
import { IoCall } from "react-icons/io5";
import { RiLoginBoxLine } from "react-icons/ri";
import { PiCopyright } from "react-icons/pi";
import Images from "@/constant/Image";


const NAVY = "#0C3978";
const CYAN = "#16B8E4";

interface PolicyLayoutProps {
  title?: string;
  children: React.ReactNode;
}

const PolicyLayout = ({ title, children }: PolicyLayoutProps) => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50">

      {/* ===== Header ===== */}
      <header className="w-full sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="w-full px-6 h-14 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={Images.MaverickLogo}
              alt="Maverick Signature"
              width={120}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            <Link href="/">
              <span
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:bg-blue-50"
                style={{ color: NAVY }}
              >
                <FaHouse size={13} />
                Home
              </span>
            </Link>
            <Link href="/auth/login">
              <span
                className="flex items-center gap-1.5 text-sm font-medium text-white px-3 py-1.5 rounded-lg cursor-pointer transition-opacity hover:opacity-90"
                style={{
                  background: `linear-gradient(to right, ${NAVY}, ${CYAN})`,
                }}
              >
                <RiLoginBoxLine size={14} />
                Login
              </span>
            </Link>
          </nav>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="grow w-full px-4 sm:px-6 lg:px-10 py-6">

        {/* Page Title */}
        {title && (
          <p className="text-base sm:text-lg font-bold text-gray-900 pb-3">
            {title}
          </p>
        )}

        {/* Content Card */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-8 overflow-auto">
            <style>{`
              ::-webkit-scrollbar { width: 4px; height: 8px; }
              ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
              ::-webkit-scrollbar-thumb { background-color: ${CYAN}; border-radius: 4px; }
              ::-webkit-scrollbar-thumb:hover { background-color: ${NAVY}; }

              .policy-content h2 {
                font-size: 1rem; font-weight: 700;
                color: ${NAVY}; margin-top: 1.5rem; margin-bottom: 0.5rem;
              }
              .policy-content h3 {
                font-size: 0.9rem; font-weight: 600;
                color: #374151; margin-top: 1rem; margin-bottom: 0.4rem;
              }
              .policy-content p  { margin-bottom: 0.6rem; color: #4B5563; }
              .policy-content ul,
              .policy-content ol { padding-left: 1.4rem; margin-bottom: 0.6rem; color: #4B5563; }
              .policy-content li { margin-bottom: 0.25rem; }
              .policy-content strong { color: #111827; }
              .policy-content a { color: ${CYAN}; text-decoration: underline; }
              .policy-content hr { border-color: #E5E7EB; margin: 1rem 0; }
            `}</style>
            <div className="policy-content text-sm leading-relaxed text-gray-700">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* ===== Footer ===== */}
      <footer className="w-full bg-white border-t border-gray-200 px-6 pt-4 pb-0">

        {/* Brand */}
        <p className="text-sm font-bold mb-4" style={{ color: NAVY }}>
          Maverick Signature Network Pvt. Ltd.
        </p>

        <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pb-3">

          {/* Call */}
          <div className="flex items-center gap-2">
            <IoCall size={20} color={CYAN} />
            <div>
              <p className="text-xs text-gray-500">Call us</p>
              <p className="text-sm font-medium text-gray-800">+91 8186939193</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-2">
            <IoIosMail size={20} color={CYAN} />
            <div>
              <p className="text-xs text-gray-500">Email us</p>
              <p className="text-sm font-medium text-gray-800">
                support@mavericksignature.com
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2">
            <FaLocationDot size={18} color={CYAN} className="mt-0.5 shrink-0" />
            <p className="text-sm text-gray-800 leading-snug">
              # 14‑681, Kanuru, NTR Dt.,<br />
              Andhra Pradesh – 520007, India
            </p>
          </div>

          {/* Social */}
          {/* <div className="flex flex-col gap-1.5">
            <p className="text-xs text-gray-500 font-medium">Follow Us On</p>
            <div className="flex items-center gap-2">
              {[
                { href: "https://www.instagram.com/mavericksignature/", Icon: FaInstagram },
                { href: "https://www.linkedin.com/company/mavericksignature/", Icon: FaLinkedin },
                { href: "https://www.youtube.com/@mavericksignature", Icon: FaYoutube },
                { href: "https://www.facebook.com/mavericksignature", Icon: FaSquareFacebook },
              ].map(({ href, Icon }, i) => (
                <a key={i} href={href} target="_blank" rel="noopener noreferrer">
                  <span
                    className="h-7 w-7 flex items-center justify-center rounded-full hover:opacity-80 transition-opacity"
                    style={{
                      background: `linear-gradient(to bottom right, ${NAVY}, ${CYAN})`,
                    }}
                  >
                    <Icon size={14} color="white" />
                  </span>
                </a>
              ))}
            </div>
          </div> */}
        </div>

        {/* Policy Links */}
        <div className="border-t border-gray-100 py-2 flex flex-wrap justify-center gap-4 text-xs text-gray-400">
          <Link href="/terms-and-conditions" className="hover:text-[#16B8E4] transition">
            Terms & Conditions
          </Link>
          <Link href="/privacy-policy" className="hover:text-[#16B8E4] transition">
            Privacy Policy
          </Link>
          <Link href="/refund-policy" className="hover:text-[#16B8E4] transition">
            Refund Policy
          </Link>
          <Link href="/shipping-policy" className="hover:text-[#16B8E4] transition">
            Shipping Policy
          </Link>
          <Link href="/contact-us" className="hover:text-[#16B8E4] transition">
            Contact Us
          </Link>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-200 py-2.5 flex justify-center items-center gap-1 text-gray-400">
          <PiCopyright size={13} />
          <span className="text-xs">
            2026 Maverick Signature Network Pvt. Ltd. All Rights Reserved.
          </span>
        </div>
      </footer>
    </div>
  );
};

export default PolicyLayout;