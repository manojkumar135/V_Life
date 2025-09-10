"use client";
import React from "react";
import Select from "react-select";

interface Option {
  label: string;
  value: string;
}

interface MultiSelectFieldProps {
  label?: string;
  name?: string;
  values?: Option[];
  onChange?: (selectedOptions: Option[]) => void;
  options: Option[];
  className?: string;
  labelClassName?: string;
  containerClassName?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  error?: string;
}

const MultiSelectField: React.FC<MultiSelectFieldProps> = ({
  label,
  name,
  values = [],
  onChange,
  options,
  className = "",
  labelClassName = "",
  containerClassName = "",
  isDisabled,
  isRequired,
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
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex flex-col">
        <Select
          id={name}
          name={name}
          value={values}
          onChange={(selected) => onChange?.(selected as Option[])}
          options={options}
          isMulti
          isDisabled={isDisabled}
          className={className}
          classNamePrefix="react-select"
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

export default MultiSelectField;
