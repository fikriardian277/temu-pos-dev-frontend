import React from "react";
import { Button } from "@/components/ui/Button";
import { ArrowLeftRight, Loader2 } from "lucide-react";

export default function MatchAction({
  selectedMutation,
  selectedItem,
  onMatch,
  isProcessing,
}) {
  // Cek apakah kedua sisi sudah dipilih
  const isReady = selectedMutation && selectedItem;

  return (
    <>
      {/* === DESKTOP VERSION (Floating Center) === */}
      {/* Posisinya absolute di tengah-tengah antara kolom kiri dan kanan */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden lg:block pointer-events-none">
        <div className="pointer-events-auto">
          <Button
            size="lg"
            className={`rounded-full shadow-2xl px-0 h-14 w-14 flex items-center justify-center transition-all duration-300 ${
              isReady
                ? "bg-green-600 hover:bg-green-700 scale-110 ring-4 ring-green-100"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
            disabled={!isReady || isProcessing}
            onClick={onMatch}
            title="Klik untuk menjodohkan"
          >
            {isProcessing ? (
              <Loader2 className="animate-spin h-6 w-6" />
            ) : (
              <ArrowLeftRight className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* === MOBILE VERSION (Fixed Bottom Drawer) === */}
      {/* Muncul melayang di bawah layar HP */}
      <div className="lg:hidden fixed bottom-6 left-4 right-4 z-50">
        <Button
          className={`w-full shadow-xl h-12 text-lg font-bold transition-all ${
            isReady
              ? "bg-green-600 hover:bg-green-700"
              : "bg-slate-300 text-slate-500"
          }`}
          disabled={!isReady || isProcessing}
          onClick={onMatch}
        >
          {isProcessing ? (
            <Loader2 className="animate-spin mr-2 h-5 w-5" />
          ) : (
            <ArrowLeftRight className="mr-2 h-5 w-5" />
          )}
          JODOHKAN
        </Button>
      </div>
    </>
  );
}
