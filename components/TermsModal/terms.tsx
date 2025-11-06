"use client";

import { IoClose } from "react-icons/io5";
import { TERMS_AND_CONDITIONS } from "@/data/terms-and-conditions";
import { PRIVACY_POLICY } from "@/data/privacy-policy";
import { REFUND_POLICY } from "@/data/refund-policy";
import ReactMarkdown from "react-markdown";


interface TermsModalProps {
  isOpen: boolean;
   type: "terms" | "privacy" | "refund" | null;
  onClose: () => void;
}

export default function TermsModal({ isOpen,type, onClose }: TermsModalProps) {
if (!isOpen || !type) return null;
   const dataMap = {
    terms: {
      title: "Terms & Conditions",
      content: TERMS_AND_CONDITIONS,
    },
    privacy: {
      title: "Privacy Policy",
      content: PRIVACY_POLICY,
    },
    refund: {
      title: "Refund Policy",
      content: REFUND_POLICY,
    },
  };

  const { title, content } = dataMap[type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg relative p-6 h-4/5 w-5/7 max-sm:h-6/7 max-md:w-11/12"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-red-600 cursor-pointer"
          onClick={onClose}
        >
          <IoClose size={24} />
        </button>

        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className="text-sm text-gray-700 h-8/9  xl:max-h-100 overflow-y-auto prose prose-sm px-5 max-md:px-3 ">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
