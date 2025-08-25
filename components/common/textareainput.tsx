import React from "react";
import clsx from "clsx"; // optional helper for merging class names

interface TextareaFieldProps {
  label: string;
  name: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string; // ✅ allow external styles
}

const TextareaField: React.FC<TextareaFieldProps> = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  className = "",
}) => (
  <div className="flex flex-col items-start">
    <label className="text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700 mb-2">
      {label} :
    </label>
    <textarea
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={clsx(
        "border border-gray-500 rounded-lg px-3 py-2 w-[66%] max-lg:w-full h-24 bg-white resize-none",
        className
      )}
    ></textarea>
  </div>
);

export default TextareaField;
