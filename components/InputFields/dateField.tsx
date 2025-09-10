"use client";
import React, { ChangeEvent } from "react";

interface DateFieldProps {
  label?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  labelClassName?: string;
  containerClassName?: string;
  name?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  min?: string; // yyyy-mm-dd
  max?: string; // yyyy-mm-dd
  error?: string;
}

const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  onChange,
  onBlur,
  className = "",
  labelClassName = "",
  containerClassName = "",
  name,
  disabled,
  readOnly,
  required,
  min,
  max,
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
          type="date"
          placeholder="DD-MM-YYYY"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          min={min}
          max={max}
          className={`uppercase w-full px-4 py-2 border ${
            error ? "border-red-500" : "border-gray-400"
          } rounded-lg bg-white text-sm text-gray-700 transition-all ${className}`}
        />
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

export default DateField;
