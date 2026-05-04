import Link from "next/link";
import { FaInstagram, FaLinkedin, FaYoutube, FaSquareFacebook } from "react-icons/fa6";
import { IoIosMail } from "react-icons/io";
import { IoCall } from "react-icons/io5";
import { FaLocationDot, FaHouse } from "react-icons/fa6";
import { RiLoginBoxLine } from "react-icons/ri";
import { PiCopyright } from "react-icons/pi";

const GRADIENT = "linear-gradient(135deg, #3b82f6, #7c3aed)";
const GRADIENT_TEXT: React.CSSProperties = {
  background: GRADIENT,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

interface PolicyLayoutProps {
  title?: string;
  children: React.ReactNode;
}

const PolicyLayout = ({ title, children }: PolicyLayoutProps) => {
  return (
    <div className="min-h-screen min-w-full max-w-full flex flex-col bg-gray-50">

      {/* ===== Header ===== */}
      <header className="w-full sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="w-full px-6 h-14 flex items-center justify-between">

          {/* Logo + Brand Name */}
          <div className="flex flex-row items-center gap-2">
            <Link href="/" className="flex items-center">
             
                <img
                  src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1777351879/Untitled_design_35_zignpq.png"
                  className="h-12 w-12 rounded-none"
                  alt="WONDigi Logo"
                />
            </Link>
            <p className="text-md sm:text-lg font-bold pl-1" style={GRADIENT_TEXT}>
              WON Event
            </p>
          </div>

          {/* Nav Links with icons */}
          <nav className="flex items-center gap-1">
            <Link href="/">
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-600 px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:bg-violet-50 hover:text-violet-700">
                <FaHouse size={13} />
                Home
              </span>
            </Link>
            {/* <Link href="/login">
              <span
                className="flex items-center gap-1.5 text-sm font-medium text-white px-3 py-1.5 rounded-lg cursor-pointer transition-opacity hover:opacity-90"
                style={{ background: GRADIENT }}
              >
                <RiLoginBoxLine size={14} />
                Login
              </span>
            </Link> */}
          </nav>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="flex-grow w-full px-4 sm:px-6 lg:px-10 py-6">

        {/* Page Title */}
        {title && (
          <p className="text-md sm:text-lg font-bold pb-3 text-gray-900">
            {title}
          </p>
        )}

        {/* Content Card */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Gradient top bar */}
          <div className="h-1 w-full" style={{ background: GRADIENT }} />

          <div className="p-2 sm:p-5 overflow-auto max-h-[68vh]">
            <style>{`
              ::-webkit-scrollbar { width: 4px; height: 8px; }
              ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
              ::-webkit-scrollbar-thumb { background: linear-gradient(#3b82f6, #7c3aed); border-radius: 4px; }
              ::-webkit-scrollbar-thumb:hover { background-color: #7c3aed; }
            `}</style>
            <div className="text-sm leading-relaxed text-gray-700">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* ===== Footer ===== */}
      <footer className="w-full bg-white border-t border-gray-200 px-6 pt-4 pb-0">

        {/* Gradient top bar */}

        <p className="text-sm font-semibold mb-4" >
          By NOWIT SERVICES Pvt Ltd
        </p>

        <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pb-2">

          {/* Call */}
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: GRADIENT }}
            >
              <IoCall size={15} color="white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Call us</p>
              <p className="text-sm font-medium text-gray-800">+91 7893536373</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: GRADIENT }}
            >
              <IoIosMail size={15} color="white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Email us</p>
              <p className="text-sm font-medium text-gray-800">testmail@nowitservices.com</p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: GRADIENT }}
            >
              <FaLocationDot size={13} color="white" />
            </div>
            <p className="text-sm text-gray-800 leading-snug mt-1">
              17-6-284-1, Uma Shankar Nagar,<br />
              Vijayawada, Andhra Pradesh, India - 520007
            </p>
          </div>

          {/* Social */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-gray-500 font-medium">Follow Us On</p>
            <div className="flex items-center gap-2">
              {[
                { href: "https://www.instagram.com/_nowitservices_/profilecard/", Icon: FaInstagram },
                { href: "https://www.linkedin.com/company/nowitservices/", Icon: FaLinkedin },
                { href: "https://www.youtube.com/channel/UCcGdytqPFKcM_iASD0mVGbA", Icon: FaYoutube },
                { href: "https://www.facebook.com/NowITServices?_rdr", Icon: FaSquareFacebook },
              ].map(({ href, Icon }, i) => (
                <a key={i} href={href} target="_blank" rel="noopener noreferrer">
                  <span
                    className="h-7 w-7 flex items-center justify-center rounded-full hover:opacity-80 transition-opacity"
                    style={{ background: GRADIENT }}
                  >
                    <Icon size={14} color="white" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-200 py-2.5 flex justify-center items-center gap-1 text-gray-400">
          <PiCopyright size={13} />
          <span className="text-xs">2024 All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
};

export default PolicyLayout;