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
  disabled?: boolean;                   // ← added
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
  disabled = false,                     // ← added to destructure
  className = "",
  labelClassName = "",
  containerClassName = "",
  required,
  error,
  onClear,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileUrl,  setFileUrl]  = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

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
      if (url) URL.revokeObjectURL(url);
    };
  }, [value]);

  const handleClear = () => {
    if (onClear) onClear();
    if (inputRef.current) inputRef.current.value = "";
    setFileUrl(null);
    setFileName("");
  };

  /* When disabled, clicking the wrapper or buttons does nothing */
  const triggerInput = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div className={`flex flex-col gap-1 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={name}
          className={`text-[0.9rem] max-sm:text-[0.8rem] font-semibold ${
            disabled ? "text-gray-400" : "text-gray-700"
          } ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="flex flex-col gap-1">
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center w-full px-3 py-2 border ${
            error    ? "border-red-500"  :
            disabled ? "border-gray-200" :
                       "border-gray-400"
          } rounded-lg text-sm transition-all ${
            disabled ? "bg-gray-100 cursor-not-allowed opacity-70" : "bg-white cursor-pointer"
          } ${className}`}
        >
          {fileUrl ? (
            <div className="flex items-center justify-between sm:flex-1 w-full gap-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline truncate max-md:mt-1"
                title={fileName}
                /* Allow viewing existing file even when disabled */
              >
                {fileName}
              </a>

              <div className="flex gap-2 mt-1 sm:mt-0">
                {/* Hide clear + re-upload buttons when disabled */}
                {!disabled && (
                  <>
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
                      onClick={triggerInput}
                      className="p-0 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600"
                      aria-label="Upload file"
                    >
                      <FiUpload size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-between sm:flex-1 w-full gap-2"
              onClick={triggerInput}
            >
              <span
                className={`flex truncate px-3 rounded ${
                  disabled ? "text-gray-400 bg-gray-200" : "text-gray-800 bg-gray-200 cursor-pointer"
                }`}
              >
                No file chosen
              </span>

              {!disabled && (
                <button
                  type="button"
                  onClick={triggerInput}
                  className="p-0 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600"
                  aria-label="Upload file"
                >
                  <FiUpload size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Hidden native input — disabled prevents any selection */}
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="file"
          accept={accept}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className="hidden"
        />

        <div
          className={`text-red-500 text-xs mt-1 ${
            error ? "opacity-100 h-2" : "opacity-0 h-2"
          } transition-opacity`}
        >
          {error || "\u00A0"}
        </div>
      </div>
    </div>
  );
};

export default FileInput;