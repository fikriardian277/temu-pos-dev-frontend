// src/modules/admin/pages/Proses/components/TransaksiCard.jsx

import React from "react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  WashingMachine,
  PackageCheck,
  Truck,
  Check,
  Loader2,
  Clock,
} from "lucide-react";

// --- Logic Deadline Helper (Dipindah kesini biar rapi) ---
export function getDeadlineStatus(estimatedCompletionDate, items = []) {
  if (!estimatedCompletionDate) return { className: "", badgeText: null };

  const now = new Date();
  const deadline = new Date(estimatedCompletionDate);
  const diffHours = (deadline - now) / (1000 * 60 * 60);

  let durationType = "reguler";
  const firstPackageName = items?.[0]?.packages?.name?.toLowerCase() || "";
  if (firstPackageName.includes("kilat")) durationType = "kilat";
  else if (
    firstPackageName.includes("express") ||
    firstPackageName.includes("ekspres")
  )
    durationType = "ekspres";

  let badgeText = null;
  let badgeVariant = "secondary";
  if (diffHours >= 24) badgeText = `Sisa ${Math.floor(diffHours / 24)} hari`;
  else if (diffHours > 0) badgeText = `Sisa ${Math.floor(diffHours)} jam`;
  else {
    badgeText = `Telat ${Math.abs(Math.round(diffHours))} jam`;
    badgeVariant = "destructive";
  }

  let priorityScore = 1;
  let className = "";

  if (diffHours < 0) {
    priorityScore = 4;
    className = "bg-red-200 dark:bg-red-900";
  } else if (diffHours <= 2) {
    priorityScore = 3;
    className = "bg-red-100 dark:bg-red-800";
  } else if (durationType === "kilat") {
    priorityScore = 3;
    className = "bg-red-100 dark:bg-red-800";
  } else if (durationType === "ekspres") {
    priorityScore = 2;
    className = "bg-yellow-100 dark:bg-yellow-900";
    badgeVariant = "warning";
  } else if (durationType === "reguler" && diffHours <= 24) {
    priorityScore = 2;
    className = "bg-yellow-100 dark:bg-yellow-900";
    badgeVariant = "warning";
  }

  return { className, badgeText, badgeVariant, priorityScore };
}

const TransaksiCard = ({
  transaksi,
  onUpdateStatus,
  onSelesaikan,
  isUpdating,
}) => {
  const {
    process_status,
    payment_status,
    service_type,
    estimated_completion_date,
    order_items,
    invoice_code,
    customers,
  } = transaksi;
  const deadlineInfo = getDeadlineStatus(
    estimated_completion_date,
    order_items
  );

  const getStatusVariant = () => {
    if (payment_status === "Lunas") return "default"; // Hitam/Primary
    return "destructive"; // Merah
  };

  return (
    <Card
      className={`mb-4 shadow-sm hover:shadow-md transition-shadow ${deadlineInfo.className}`}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base font-bold">
              {customers?.name || "Pelanggan Umum"}
            </CardTitle>
            <CardDescription className="text-xs font-mono">
              {invoice_code}
            </CardDescription>
            {deadlineInfo.badgeText && (
              <Badge
                variant={deadlineInfo.badgeVariant}
                className="mt-1 text-[10px] h-5 px-1.5"
              >
                <Clock className="mr-1 h-3 w-3" /> {deadlineInfo.badgeText}
              </Badge>
            )}
          </div>
          <Badge variant={getStatusVariant()} className="text-[10px]">
            {payment_status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 py-2 text-xs text-muted-foreground space-y-1">
        {order_items?.map((item) => (
          <div key={item.id} className="flex justify-between">
            <span className="truncate max-w-[70%]">
              • {item.packages?.name}
            </span>
            <span className="font-mono">x{item.quantity}</span>
          </div>
        ))}
        {transaksi.total_piece_count > 0 && (
          <div className="pt-1 mt-1 border-t border-black/10 font-medium text-blue-600">
            Total Fisik: {transaksi.total_piece_count} pcs
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-2">
        {/* LOGIC TOMBOL AKSI */}
        {process_status === "Diterima" && (
          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => onUpdateStatus(transaksi, "Proses Cuci")}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <WashingMachine className="mr-2 h-3 w-3" />
            )}{" "}
            Mulai Cuci
          </Button>
        )}
        {process_status === "Proses Cuci" && (
          <Button
            size="sm"
            variant="secondary"
            className="w-full h-8 text-xs"
            onClick={() => onUpdateStatus(transaksi, "Siap Diambil")}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <PackageCheck className="mr-2 h-3 w-3" />
            )}{" "}
            Siap Diambil
          </Button>
        )}
        {process_status === "Siap Diambil" && (
          <>
            {service_type === "antar" || service_type === "antar_jemput" ? (
              <Button
                size="sm"
                className="w-full h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => onUpdateStatus(transaksi, "Proses Pengantaran")}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Truck className="mr-2 h-3 w-3" />
                )}{" "}
                Antar
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onSelesaikan(transaksi)}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Check className="mr-2 h-3 w-3" />
                )}{" "}
                Selesai
              </Button>
            )}
          </>
        )}
        {process_status === "Proses Pengantaran" && (
          <Button
            size="sm"
            className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onSelesaikan(transaksi)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Check className="mr-2 h-3 w-3" />
            )}{" "}
            Selesai Diantar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default TransaksiCard;
