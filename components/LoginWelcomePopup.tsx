"use client";

import React from "react";
import { useNewPopSettings } from "@/hooks/useNewPopSettings";

interface Props {
  open: boolean;
  onClose: () => void;
}

const LoginWelcomePopup: React.FC<Props> = ({ open, onClose }) => {
  const { settings, loading } = useNewPopSettings();

  // 🔒 Wait for settings + respect admin toggle
  if (loading) return null;
  if (!open || !settings.popup_enabled) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-[9999] flex justify-center items-start pt-5 px-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            relative
            bg-white
            w-full
            max-w-[750px]
            rounded-xl
            shadow-2xl
            overflow-hidden
            animate-slideDown
          "
          style={{ maxHeight: "85vh" }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="
              absolute
              top-2
              right-3
              w-7
              h-7
              rounded-full
              hover:bg-gray-200
              text-gray-700
              text-2xl
              flex
              items-center
              justify-center
              hover:text-red-600
              transition
              z-10
              cursor-pointer
            "
          >
            ×
          </button>

          {/* Header */}
          <div className="px-6 py-2">
            <h2 className="text-md font-bold text-gray-800 uppercase">
              Welcome to Maverick
            </h2>
          </div>

          {/* Image */}
          <div
            className="
              mx-2
              mb-2
              rounded-xl
              overflow-hidden
              bg-black
            "
            style={{ height: "calc(85vh - 70px)" }}
          >
            <img
              src={settings.popup_image}
              alt="Welcome Banner"
              className="w-full h-full object-fill"
            />
          </div>
        </div>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateY(-120px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideDown {
          animation: slideDown 0.45s ease-out;
        }
      `}</style>
    </>
  );
};

export default LoginWelcomePopup;
