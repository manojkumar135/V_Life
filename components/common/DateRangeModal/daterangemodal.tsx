"use client";
import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface DateFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (filter: {
    type: "all" | "on" | "range";
    date?: string;
    from?: string;
    to?: string;
  }) => void;
}

const DateFilterModal: React.FC<DateFilterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [filterType, setFilterType] = useState<"all" | "on" | "range">("all");
  const [date, setDate] = useState<Date | null>(null);
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);

  if (!isOpen) return null;

  const today = new Date();

  // Format date as yyyy-mm-dd in local timezone
  const formatDate = (d: Date | null) => {
    if (!d) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = () => {
    if (filterType === "all") {
      onSubmit({ type: "all" });
    } else if (filterType === "on") {
      if (!date) return alert("Please select a date");
      onSubmit({ type: "on", date: formatDate(date) });
    } else {
      if (!from || !to) return alert("Please select both From and To dates");
      onSubmit({ type: "range", from: formatDate(from), to: formatDate(to) });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-start justify-center bg-black/50 backdrop-blur-sm z-50 pt-5">
      <div className="bg-white rounded-lg px-4 py-3 w-[95%] sm:w-[420px] shadow-lg border border-gray-300">
        <p className="text-lg font-semibold text-black mb-4">
          Select Date Range
        </p>

        <div className="space-y-4 text-gray-800 min-lg:ml-5">
          {/* All */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={filterType === "all"}
              onChange={() => setFilterType("all")}
            />
            <span>All</span>
          </label>

          {/* On specific date */}
          <div className="flex flex-row sm:items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={filterType === "on"}
                onChange={() => setFilterType("on")}
              />
              <span>On</span>
            </label>
            <DatePicker
              selected={date}
              onChange={(d: Date | null) => setDate(d)}
              placeholderText="DD-MM-YYYY"
              dateFormat="dd-MM-yyyy"
              maxDate={today}
              className="border rounded px-2 py-1 text-black w-[100px] md:w-[120px] cursor-pointer text-center"
              onFocus={() => setFilterType("on")}
            />
          </div>

          {/* Range */}
          <div className="flex flex-row gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={filterType === "range"}
                  onChange={() => setFilterType("range")}
                />
                <span>From</span>
              </label>
              <DatePicker
                selected={from}
                onChange={(d: Date | null) => {
                  setFrom(d);
                  if (to && d && d > to) setTo(d);
                }}
                placeholderText="DD-MM-YYYY"
                dateFormat="dd-MM-yyyy"
                maxDate={today}
                className="border rounded px-2 py-1 text-black w-[100px] md:w-[120px] cursor-pointer text-center"
                onFocus={() => setFilterType("range")}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span>To</span>
              <DatePicker
                selected={to}
                onChange={(d: Date | null) => setTo(d)}
                placeholderText="DD-MM-YYYY"
                dateFormat="dd-MM-yyyy"
                minDate={from || undefined}
                maxDate={today}
                className="border rounded px-2 py-1 text-black w-[100px] md:w-[120px] cursor-pointer text-center"
                onFocus={() => setFilterType("range")}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-1 rounded bg-yellow-400 text-black font-semibold hover:bg-yellow-500 cursor-pointer"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateFilterModal;
