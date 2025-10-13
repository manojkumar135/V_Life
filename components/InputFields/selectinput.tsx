"use client";
import React from "react";
import Select from "react-select";
import CustomSelectStyles from "@/components/common/CustomSelectStyles";

interface Option {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label?: string;
  name?: string;
  value?: string | null;
  onChange?: (option: Option | null) => void;
  onBlur?: (e: React.FocusEvent<any>) => void;
  options: Option[];
  className?: string;
  labelClassName?: string;
  containerClassName?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  placeholder?: string;
  controlPaddingLeft?: string; // new prop
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
  disabled = false,
  required = false,
  error,
  placeholder = "Select an option",
  controlPaddingLeft, // receive prop
}) => {
  // Merge CustomSelectStyles with dynamic padding
  const selectStyles = {
    ...CustomSelectStyles,
    control: (provided: any, state: any) => ({
      ...CustomSelectStyles.control(provided, state),
      paddingLeft: controlPaddingLeft || "1.8rem", // use prop if provided
    }),
  };

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

      <Select
        id={name}
        name={name}
        options={options}
        value={options.find((opt) => opt.value === value) || null}
        onChange={onChange}
        onBlur={onBlur}
        isDisabled={disabled}
        placeholder={placeholder}
        styles={selectStyles}
        className={`text-sm ${className}`}
      />

      <div
        className={`text-red-500 text-xs mt-1 ${
          error ? "opacity-100 h-4" : "opacity-0 h-4"
        } transition-opacity`}
      >
        {error || "\u00A0"}
      </div>
    </div>
  );
};

export default SelectField;
