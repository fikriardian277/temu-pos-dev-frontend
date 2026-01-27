import React from "react";
import { Calendar } from "lucide-react";

export default function DateRangeFilter({ startDate, endDate, onDateChange }) {
  return (
    <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-white shadow-sm">
      <Calendar className="w-4 h-4 text-slate-500" />
      <input
        type="date"
        value={startDate}
        onChange={(e) => onDateChange("start", e.target.value)}
        className="bg-transparent text-sm outline-none w-28 cursor-pointer"
      />
      <span className="text-slate-400">-</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onDateChange("end", e.target.value)}
        className="bg-transparent text-sm outline-none w-28 cursor-pointer"
      />
    </div>
  );
}
