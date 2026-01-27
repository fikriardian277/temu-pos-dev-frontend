// src/modules/admin/pages/Proses/components/KanbanBoard.jsx

import React from "react";
import TransaksiCard from "./TransaksiCard";
import { Separator } from "@/components/ui/Separator";

const KanbanColumn = ({
  title,
  transactions,
  onUpdateStatus,
  onSelesaikan,
  isUpdating,
}) => (
  <div className="flex-1 min-w-[300px] h-full flex flex-col bg-slate-50/50 rounded-lg mx-1 border border-slate-100">
    <div className="p-3 text-center sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b shadow-sm rounded-t-lg">
      <h2 className="font-bold text-sm uppercase tracking-wide text-slate-700">
        {title}
      </h2>
      <Badge
        variant="outline"
        className="mt-1 text-[10px] h-5 bg-slate-100 border-0 text-slate-500"
      >
        {transactions.length}
      </Badge>
    </div>
    <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200">
      {transactions.length > 0 ? (
        transactions.map((tx) => (
          <TransaksiCard
            key={tx.id}
            transaksi={tx}
            onUpdateStatus={onUpdateStatus}
            onSelesaikan={onSelesaikan}
            isUpdating={isUpdating === tx.id}
          />
        ))
      ) : (
        <div className="h-32 flex items-center justify-center text-slate-300 italic text-xs">
          Kosong
        </div>
      )}
    </div>
  </div>
);

import { Badge } from "@/components/ui/Badge"; // Lupa import badge tadi

export default function KanbanBoard({
  statusList,
  onUpdateStatus,
  onSelesaikan,
  isUpdating,
}) {
  return (
    <div className="hidden md:flex flex-row h-[calc(100vh-140px)] overflow-x-auto pb-4 gap-2">
      {statusList.map((status) => (
        <KanbanColumn
          key={status.value}
          title={status.title}
          transactions={status.data}
          onUpdateStatus={onUpdateStatus}
          onSelesaikan={onSelesaikan}
          isUpdating={isUpdating}
        />
      ))}
    </div>
  );
}
