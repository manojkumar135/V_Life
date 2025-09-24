"use client";
import React from "react";
import Select from "react-select";
import customSelectStyles from "@/components/common/CustomSelectStyles";

interface StatusSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  touched?: boolean;
  className?: string;
  containerClassName?: string;
  labelClassName?: string;
  options: { label: string; value: string }[];
  required?: boolean;
}

const StatusSelect: React.FC<StatusSelectProps> = ({
  label,
  value,
  onChange,
  onBlur,
  error,
  touched,
  className = "",
  containerClassName = "",
  labelClassName = "",
  options,
  required = false,
}) => {
  return (
    <div className={`flex flex-col gap-1 -mb-3 ${containerClassName}`}>
      {label && (
        <label
          className={`text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Select
        options={options}
        value={options.find((option) => option.value === value)}
        onChange={(selectedOption: any) =>
          onChange(selectedOption?.value || "")
        }
        onBlur={onBlur}
        styles={{
          ...customSelectStyles,
          control: (provided, state) => ({
            ...customSelectStyles.control(provided, state),
            paddingLeft: "0rem", // override padding
            border: state.isFocused
              ? "1.2px solid #000000"
              : error
              ? "1.2px solid #ef4444"
              : "1.2px solid #9ca3af",
            boxShadow: state.isFocused
              ? "0 0 0 2px rgba(156, 163, 175, 0.3)"
              : undefined,
            minHeight: "2rem",
            borderRadius: "0.5rem", // new border-radius
            outline: "none",
          }),
          placeholder: (provided) => ({
            ...provided,
            color: "#9ca3af",
            fontSize: "0.875rem",
          }),
        }}
        classNamePrefix="react-select"
        className={`w-full text-sm transition-all ${className}`}
        placeholder="Select Status"
      />
      <div
        className={`text-red-500 text-xs mt-1 ${
          touched && error ? "opacity-100 h-4" : "opacity-0 h-4"
        } transition-opacity`}
      >
        {touched && error ? error : "\u00A0"}
      </div>
    </div>
  );
};

export default StatusSelect;
