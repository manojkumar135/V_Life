import React from "react";
import clsx from "clsx";

interface TextareaFieldProps {
  label: string;
  name: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  required?: boolean;
}

const TextareaField: React.FC<TextareaFieldProps> = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  className = "",
  required = false,
}) => (
  <div className="flex flex-col items-start">
    <label className="text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700 mb-2">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>} 
    </label>
    <textarea
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className={clsx(
        "border border-gray-500 rounded-lg px-3 py-2 w-[66%] max-lg:w-full bg-white resize-none text-sm",
        className // ✅ now your height overrides here
      )}
    />
  </div>
);

export default TextareaField;
