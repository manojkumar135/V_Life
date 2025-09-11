"use client";
import React, { ChangeEvent, useRef, useState, useEffect } from "react";
import { FiUpload, FiX } from "react-icons/fi";

interface FileInputProps {
  label?: string;
  name: string;
  value?: File | string | null;
  accept?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;

  className?: string;
  labelClassName?: string;
  containerClassName?: string;
  required?: boolean;
  error?: string;
  onClear?: () => void;
}

const FileInput: React.FC<FileInputProps> = ({
  label,
  name,
  value,
  accept = "image/*,.pdf",
  onChange,
  onBlur,

  className = "",
  labelClassName = "",
  containerClassName = "",
  required,
  error,
  onClear,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  // Generate blob URL only when value changes
  useEffect(() => {
    let url: string | null = null;

    if (value instanceof File) {
      url = URL.createObjectURL(value);
      setFileName(value.name);
      setFileUrl(url);
    } else if (typeof value === "string" && value) {
      setFileName(value.split("/").pop() || "File");
      setFileUrl(value);
    } else {
      setFileName("");
      setFileUrl(null);
    }

    return () => {
      // Cleanup old blob URL if it exists
      if (url) URL.revokeObjectURL(url);
    };
  }, [value]);

  const handleClear = () => {
    if (onClear) onClear(); // Notify parent to reset value to null
    if (inputRef.current) inputRef.current.value = "";
    setFileUrl(null);
    setFileName("");
  };

  return (
    <div className={`flex flex-col gap-1 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={name}
          className={`text-[0.9rem] max-sm:text-[0.8rem] font-semibold text-gray-700 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="flex flex-col gap-1">
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center w-full px-3 py-2 border ${
            error ? "border-red-500" : "border-gray-400"
          } rounded-lg bg-white text-sm transition-all ${className}`}
        >
          {fileUrl ? (
            <div className="flex items-center justify-between sm:flex-1 w-full gap-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline truncate max-md:mt-1"
                title={fileName}
              >
                {fileName}
              </a>

              <div className="flex gap-2 mt-1 sm:mt-0">
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-0 rounded-full hover:bg-red-100 text-red-500 cursor-pointer"
                  aria-label="Clear file"
                >
                  <FiX size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="p-0 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600"
                  aria-label="Upload file"
                >
                  <FiUpload size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between sm:flex-1 w-full gap-2">
              <span
                className="flex text-gray-800 truncate cursor-pointer bg-gray-200 px-3 rounded"
                onClick={() => inputRef.current?.click()}
              >
                No file chosen
              </span>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="p-0 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600"
                aria-label="Upload file"
              >
                <FiUpload size={16} />
              </button>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          id={name}
          name={name}
          type="file"
          accept={accept}
          onChange={onChange}
          onBlur={onBlur}
          className="hidden"
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

export default FileInput;
