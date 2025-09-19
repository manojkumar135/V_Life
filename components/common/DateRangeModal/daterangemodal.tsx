"use client";
import React, { useState } from "react";

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
  const [date, setDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (filterType === "all") {
      onSubmit({ type: "all" });
    } else if (filterType === "on") {
      if (!date) return alert("Please select a date");
      onSubmit({ type: "on", date });
    } else {
      if (!from || !to) return alert("Please select both From and To dates");
      onSubmit({ type: "range", from, to });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-start justify-center bg-black/50 backdrop-blur-sm z-50 pt-5">
      <div className="bg-white rounded-lg px-4 py-3 w-[95%] sm:w-[450px] shadow-lg border border-gray-300">
        <p className="text-lg font-semibold text-black mb-4">
          Select Date Range
        </p>

        <div className="space-y-4 text-gray-800">
          {/* All */}
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={filterType === "all"}
              onChange={() => setFilterType("all")}
            />
            <span>All</span>
          </label>

          {/* On specific date */}
          <div className="flex flex-row sm:items-center gap-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={filterType === "on"}
                onChange={() => setFilterType("on")}
              />
              <span>On</span>
            </label>
            <input
              type="date"
              className="border rounded px-2 py-1 border-gray-400 text-black uppercase w-[150px] sm:w-auto"
              disabled={filterType !== "on"}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Range */}
          <div className="flex flex-row gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 ">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={filterType === "range"}
                  onChange={() => setFilterType("range")}
                />
                <span>From</span>
              </label>
              <input
                type="date"
                className="border rounded px-2 py-1 border-gray-400 text-black uppercase w-[150px] sm:w-auto"
                disabled={filterType !== "range"}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span>To</span>
              <input
                type="date"
                className="border rounded px-2 py-1 border-gray-400 text-black uppercase w-[150px] sm:w-auto"
                disabled={filterType !== "range"}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-1 rounded bg-gray-500 text-white hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-1 rounded bg-yellow-400 text-black font-semibold hover:bg-yellow-500"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateFilterModal;
