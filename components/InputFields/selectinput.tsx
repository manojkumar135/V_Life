"use client";
import React from "react";

interface Option {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label?: string;
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  options: Option[];
  className?: string;
  labelClassName?: string;
  containerClassName?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  options,
  className = "",
  labelClassName = "",
  containerClassName = "",
  disabled,
  required,
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
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          className={`w-full px-4 py-2 border ${
            error ? "border-red-500" : "border-gray-400"
          } rounded-lg bg-white text-sm placeholder-gray-400 transition-all ${className}`}
        >
          {/* <option value="">Select an option</option> */}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div
          className={`text-red-500 text-xs mt-1 ${
            error ? "opacity-100 h-4" : "opacity-0 h-4"
          } transition-opacity`}
        >
          {error || "\u00A0"}
        </div>
      </div>
    </div>
  );
};

export default SelectField;
