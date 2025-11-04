"use client";

import { IoClose } from "react-icons/io5";
import { TERMS_AND_CONDITIONS } from "@/data/terms-and-conditions";
import ReactMarkdown from "react-markdown";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose} // click outside closes modal
    >
      <div
        className="bg-white   rounded-lg shadow-lg relative p-6 h-4/5 w-5/7 max-md:h-6/7 max-md:w-11/12"
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-red-600 cursor-pointer"
          onClick={onClose}
        >
          <IoClose size={24} />
        </button>

        <h2 className="text-xl font-semibold mb-4">Terms and Conditions</h2>
        <div className="text-sm text-gray-700 max-h-100 overflow-y-auto prose prose-sm">
          <ReactMarkdown>{TERMS_AND_CONDITIONS}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
