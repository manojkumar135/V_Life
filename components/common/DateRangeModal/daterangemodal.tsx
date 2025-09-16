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
    <div className="fixed inset-0 flex items-start justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-white rounded-lg p-6 w-[500px] shadow-lg border border-gray-300">
        <h2 className="text-xl font-semibold text-black mb-4">
          Select Date Range
        </h2>

        <div className="space-y-3 text-gray-800">
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
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={filterType === "on"}
              onChange={() => setFilterType("on")}
            />
            <span>On</span>
            <input
              type="date"
              className="border rounded px-2 py-1 ml-2 border-gray-400 text-black uppercase"
              disabled={filterType !== "on"}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          {/* Range */}
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={filterType === "range"}
              onChange={() => setFilterType("range")}
            />
            <span>From</span>
            <input
              type="date"
              className="border rounded px-2 py-1 ml-2 border-gray-400 text-black uppercase"
              disabled={filterType !== "range"}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span className="mx-2">To</span>
            <input
              type="date"
              className="border rounded px-2 py-1 border-gray-400 text-black uppercase"
              disabled={filterType !== "range"}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded bg-yellow-400 text-black font-semibold hover:bg-yellow-500"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateFilterModal;
