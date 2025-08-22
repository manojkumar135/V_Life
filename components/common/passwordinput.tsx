"use client";
import React, { useState, ChangeEvent } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string; // input styles
  labelClassName?: string; // label styles
  containerClassName?: string; // wrapper styles
  errorClassName?: string; // error text styles
  name?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  error?: string;
  prefix?: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  placeholder = "",
  value,
  onChange,
  onBlur,
  className = "",
  labelClassName = "",
  containerClassName = "",
  errorClassName = "",
  name,
  disabled,
  readOnly,
  required,
  minLength,
  maxLength,
  error,
  prefix,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`flex flex-col gap-1 -mb-3 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={name}
          className={`text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="flex flex-col">
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-gray-600 text-md font-semibold">
              {prefix}
            </span>
          )}

          <input
            id={name}
            name={name}
            type={showPassword ? "text" : "password"}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            minLength={minLength}
            maxLength={maxLength}
            className={`w-full px-4 py-2 border ${
              error ? "border-red-500" : "border-gray-400"
            } rounded-lg bg-white text-sm placeholder-gray-400 transition-all ${
              prefix ? "pl-8" : ""
            } ${className}`}
          />

          {/* Show/Hide Button */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-gray-600 hover:text-gray-800"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Error Message */}
        <div
          className={`text-xs mt-1 transition-opacity ${
            error ? "opacity-100 h-4 text-red-500" : "opacity-0 h-4"
          } ${errorClassName}`}
        >
          {error || "\u00A0"}
        </div>
      </div>
    </div>
  );
};

export default PasswordInput;
