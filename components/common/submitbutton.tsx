import React from "react";
import clsx from "clsx";

interface ButtonProps {
  type?: "button" | "submit" | "reset";
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  type = "button",
  children,
  onClick,
  className = "",
  disabled = false,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "bg-yellow-300 hover:bg-yellow-300 text-black font-semibold py-2 px-6 rounded transition-colors duration-200 disabled:opacity-50 cursor-pointer",
        className
      )}
    >
      {children}
    </button>
  );
};

export default Button;
