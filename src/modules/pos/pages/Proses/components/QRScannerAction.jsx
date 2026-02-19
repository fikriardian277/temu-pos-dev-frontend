import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { QrCode, Loader2, AlertCircle } from "lucide-react";

const QRScannerAction = ({ onScanResult }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 1. KUNCI CALLBACK BIAR GAK BIKIN RESTART
  const onScanResultRef = useRef(onScanResult);

  useEffect(() => {
    onScanResultRef.current = onScanResult;
  }, [onScanResult]);

  useEffect(() => {
    let html5QrCode;

    if (isOpen) {
      setErrorMsg("");

      // Delay dikit biar aman
      const timer = setTimeout(() => {
        if (html5QrCode?.isScanning) return;

        html5QrCode = new Html5Qrcode("reader");

        const config = {
          // 1. TURUNIN FPS (SANGAT PENTING!)
          // 10 itu terlalu berat buat HP kalau didiemin lama. 4-5 udah lebih dari cukup buat QR.
          fps: 4,

          qrbox: { width: 250, height: 250 },

          // 2. HAPUS aspectRatio!
          // Maksa rasio 1:1 bikin HP kerja 2x lipat buat nge-crop video real-time. Biarin natural.

          // 3. MATIKAN FITUR FLIP
          // Gak usah ngecek QR yang posisinya kebalik (kayak dari pantulan cermin), ini makan memori.
          disableFlip: true,
        };

        html5QrCode
          .start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              console.log("QR Code Scanned:", decodedText);

              // Stop dulu baru panggil callback
              html5QrCode
                .stop()
                .then(() => {
                  html5QrCode.clear();
                  setIsOpen(false);
                  if (onScanResultRef.current) {
                    onScanResultRef.current(decodedText);
                  }
                })
                .catch((err) => console.log("Stop failed", err));
            },
            (errorMessage) => {
              // Biarin kosong biar gak spam console
            },
          )
          .catch((err) => {
            console.error("Gagal start kamera:", err);
            setErrorMsg("Kamera tidak dapat diakses. Coba refresh halaman.");
          });
      }, 100);

      return () => {
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode
            .stop()
            .then(() => html5QrCode.clear())
            .catch((err) => console.error("Cleanup error", err));
        }
      };
    }
  }, [isOpen]);

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <QrCode className="w-4 h-4 mr-2" /> Scan QR
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Scan Struk Cucian</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-4 min-h-[320px]">
            {/* WRAPPER BARU: Area kekuasaan React (Bisa tumpuk-tumpukan pake absolute) */}
            <div className="w-full h-[300px] bg-slate-100 rounded-lg overflow-hidden relative">
              {/* 1. AREA KEKUASAAN SCANNER: Harus KOSONG MELOMPONG! */}
              <div
                id="reader"
                className="w-full h-full absolute inset-0 z-10"
              ></div>

              {/* 2. AREA LOADING REACT: Ditaruh di LUAR div#reader, posisinya di belakang (z-0) */}
              {!errorMsg && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 z-0 pointer-events-none">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded flex items-center gap-2 z-10 relative">
                <AlertCircle className="w-4 h-4" />
                {errorMsg}
              </div>
            )}

            {!errorMsg && (
              <p className="text-sm text-muted-foreground mt-4 text-center z-10 relative">
                Arahkan kamera ke QR Code di struk.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QRScannerAction;
