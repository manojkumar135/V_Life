import React from "react";

interface CheckboxFieldProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (value: string) => void;
}

const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  options,
  selected,
  onChange,
}) => (
  <div className="flex flex-col items-start">
    <label className="text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700 mb-2">{label} :</label>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 text-sm w-[50%] max-lg:w-full ml-5">
      {options.map((opt) => (
        <label key={opt} className="flex items-center space-x-2">
          <input
            type="checkbox"
            className="accent-yellow-400"
            checked={selected.includes(opt)}
            onChange={() => onChange(opt)}
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  </div>
);

export default CheckboxField;
