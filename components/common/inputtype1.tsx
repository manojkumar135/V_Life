"use client";
import React, { ChangeEvent } from "react";

interface InputFieldProps {
  label?: string;
  type?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  labelClassName?: string;
  containerClassName?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  error?: string | undefined;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  type = "text",
  placeholder = "",
  value,
  onChange,
  onBlur,
  className = "",
  labelClassName = "",
  containerClassName = "",
  name,
  disabled,
  required,
  min,
  max,
  minLength,
  maxLength,
  error,
}) => {
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
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          minLength={minLength}
          maxLength={maxLength}
          className={`w-full px-4 py-2 border ${
            error ? "border-red-500" : "border-gray-400"
          } rounded-lg bg-white text-sm placeholder-gray-400  transition-all ${className}`}
        />
        <div 
          className={`text-red-500 text-xs mt-1 ${
            error ? "opacity-100 h-4" : "opacity-0 h-4"
          } transition-opacity`}
        >
          {error || "\u00A0"} {/* &nbsp; as fallback */}
        </div>
      </div>
    </div>
  );
};

export default InputField;