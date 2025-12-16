import React from "react";

interface CheckboxFieldProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (value: string) => void;
  error?: string | string[];
}

const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  options,
  selected,
  onChange,
  error,
}) => (
  <div className="flex flex-col items-start w-full">
    {/* Label */}
    <label className="text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700 mb-2">
      {label} :
    </label>

    {/* Options */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 text-sm w-[50%] max-lg:w-full ml-5">
      {options.map((opt) => (
        <label key={opt} className="flex items-center space-x-2">
          <input
            type="checkbox"
            className="accent-black-400"
            checked={selected.includes(opt)}
            onChange={() => onChange(opt)}
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>

    {/* Error Message */}
    {error && (
      <p className="text-red-500 text-sm mt-1 ml-5">
        {Array.isArray(error) ? error.join(", ") : error}
      </p>
    )}
  </div>
);

export default CheckboxField;
