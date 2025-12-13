"use client";
import React from "react";
import { IoClose } from "react-icons/io5";
import { useRouter } from "next/navigation";

interface AlertBoxProps {
  title: string;
  message: React.ReactNode; // allows JSX inside
  buttonLabel?: string;
  buttonAction?: () => void;
  onClose: () => void;
  visible: boolean;
  bgColor?: string; // default: red
}

const AlertBox: React.FC<AlertBoxProps> = ({
  title,
  message,
  buttonLabel,
  buttonAction,
  onClose,
  visible,
  bgColor = "bg-red-600",
}) => {
  const router = useRouter();

  if (!visible) return null;

  return (
    <div className="fixed bottom-2 right-4 z-20 transition-transform duration-500 ease-in-out transform translate-x-0 ">
      <div
        className={`${bgColor} text-white shadow-lg rounded-lg p-4 w-68 lg:w-85 relative`}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white hover:text-gray-200"
        >
          <IoClose size={18} />
        </button>
        <h2 className="font-bold text-lg mb-2">{title}</h2>
        <p className="text-sm">{message}</p>
        {buttonLabel && (
          <button
            onClick={buttonAction || (() => router.push("/"))}
            className="mt-3 w-full bg-yellow-400 text-black font-semibold py-2 px-4 rounded-lg cursor-pointer"
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertBox;
