"use client";
import PolicyLayout from "@/components/PolicyLayout";
import { IoCall } from "react-icons/io5";
import { IoIosMail } from "react-icons/io";
import { FaLocationDot, FaGlobe } from "react-icons/fa6";
 
const NAVY = "#0C3978";
const CYAN = "#16B8E4";
 
export default function ContactUsPage() {
  return (
    <PolicyLayout title="Contact Us">
      <div className="space-y-6 text-sm text-gray-700 p-2">
 
        <p className="text-gray-500 text-sm">
          We&apos;re here to help. Reach out to us through any of the channels below.
        </p>
 
        {/* Company */}
        <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Company</p>
          <p className="font-semibold text-gray-800 text-base">
            Maverick Signature Network Pvt. Ltd.
          </p>
        </div>
 
        {/* Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 
          {/* Phone */}
          <div className="flex items-start gap-3 border border-gray-100 rounded-lg p-4 bg-gray-50">
            <div
              className="h-8 w-8 flex items-center justify-center rounded-full shrink-0"
              style={{ background: `linear-gradient(to bottom right, ${NAVY}, ${CYAN})` }}
            >
              <IoCall size={15} color="white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Phone</p>
              <a href="tel:+918186939193" className="text-sm font-medium text-gray-800 hover:underline">
                +91 8186939193
              </a>
            </div>
          </div>
 
          {/* Support Email */}
          <div className="flex items-start gap-3 border border-gray-100 rounded-lg p-4 bg-gray-50">
            <div
              className="h-8 w-8 flex items-center justify-center rounded-full shrink-0"
              style={{ background: `linear-gradient(to bottom right, ${NAVY}, ${CYAN})` }}
            >
              <IoIosMail size={15} color="white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Support Email</p>
              <a
                href="mailto:support@mavericksignature.com"
                className="text-sm font-medium hover:underline break-all"
                style={{ color: CYAN }}
              >
                support@mavericksignature.com
              </a>
            </div>
          </div>
 
          {/* General Email */}
          <div className="flex items-start gap-3 border border-gray-100 rounded-lg p-4 bg-gray-50">
            <div
              className="h-8 w-8 flex items-center justify-center rounded-full shrink-0"
              style={{ background: `linear-gradient(to bottom right, ${NAVY}, ${CYAN})` }}
            >
              <IoIosMail size={15} color="white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">General Enquiry</p>
              <a
                href="mailto:mavericksignaturenetwork@gmail.com"
                className="text-sm font-medium hover:underline break-all"
                style={{ color: CYAN }}
              >
                mavericksignaturenetwork@gmail.com
              </a>
            </div>
          </div>
 
          {/* Website */}
          <div className="flex items-start gap-3 border border-gray-100 rounded-lg p-4 bg-gray-50">
            <div
              className="h-8 w-8 flex items-center justify-center rounded-full shrink-0"
              style={{ background: `linear-gradient(to bottom right, ${NAVY}, ${CYAN})` }}
            >
              <FaGlobe size={13} color="white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Website</p>
              <a
                href="https://www.mavericksignature.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
                style={{ color: CYAN }}
              >
                www.mavericksignature.com
              </a>
            </div>
          </div>
        </div>
 
        {/* Address */}
        <div className="flex items-start gap-3 border border-gray-100 rounded-lg p-4 bg-gray-50">
          <div
            className="h-8 w-8 flex items-center justify-center rounded-full shrink-0"
            style={{ background: `linear-gradient(to bottom right, ${NAVY}, ${CYAN})` }}
          >
            <FaLocationDot size={13} color="white" />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Address</p>
            <p className="text-sm text-gray-800 leading-relaxed">
              # 14‑681, Kanuru, NTR Dt.,<br />
              Andhra Pradesh – 520007, India
            </p>
          </div>
        </div>
 
      </div>
    </PolicyLayout>
  );
}