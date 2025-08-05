import React from "react";

interface TextareaFieldProps {
  label: string;
  name: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const TextareaField: React.FC<TextareaFieldProps> = ({
  label,
  name,
  placeholder,
  value,
  onChange,
}) => (
  <div className="flex flex-col items-start">
    <label className="text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700 mb-2">{label} :</label>
    <textarea
      name={name}
      // placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="border border-gray-500 rounded-lg px-3 py-2 w-[66%] max-lg:w-full h-24 bg-white resize-none"
    ></textarea>
  </div>
);

export default TextareaField;
