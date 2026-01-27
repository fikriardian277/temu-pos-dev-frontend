// src/modules/admin/pages/Proses/components/MobileView.jsx

import React, { useState } from "react";
import TransaksiCard from "./TransaksiCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

export default function MobileView({
  statusList,
  onUpdateStatus,
  onSelesaikan,
  isUpdating,
}) {
  const [mobileView, setMobileView] = useState("terima"); // Default: Diterima

  const activeMobileData =
    statusList.find((status) => status.value === mobileView)?.data || [];

  return (
    <div className="md:hidden px-4 pb-20">
      <div className="sticky top-[60px] z-20 bg-background pt-2 pb-4">
        <Select value={mobileView} onValueChange={setMobileView}>
          <SelectTrigger className="w-full shadow-sm">
            <SelectValue placeholder="Pilih Status..." />
          </SelectTrigger>
          <SelectContent>
            {statusList.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.title} ({status.data.length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {activeMobileData.length > 0 ? (
          activeMobileData.map((tx) => (
            <TransaksiCard
              key={tx.id}
              transaksi={tx}
              onUpdateStatus={onUpdateStatus}
              onSelesaikan={onSelesaikan}
              isUpdating={isUpdating === tx.id}
            />
          ))
        ) : (
          <div className="text-center py-10">
            <img
              src="/empty-box.png"
              alt="Empty"
              className="w-24 h-24 mx-auto opacity-20 mb-2"
            />
            {/* Kalau gapunya gambar, pake text aja gpp */}
            <p className="text-muted-foreground">
              Tidak ada order di status ini.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
