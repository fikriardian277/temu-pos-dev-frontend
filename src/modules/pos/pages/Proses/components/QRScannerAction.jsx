import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { QrCode, Loader2, AlertCircle, Image as ImageIcon } from "lucide-react"; // <-- Tambah icon Image

const QRScannerAction = ({ onScanResult }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const onScanResultRef = useRef(onScanResult);
  const html5QrCodeRef = useRef(null); // <-- Bikin ref untuk nyimpen "mesin" scanner
  const fileInputRef = useRef(null); // <-- Bikin ref untuk input file

  useEffect(() => {
    onScanResultRef.current = onScanResult;
  }, [onScanResult]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");

      const timer = setTimeout(() => {
        if (html5QrCodeRef.current?.isScanning) return;

        // Simpan mesin ke dalam ref biar bisa dipanggil sama fungsi upload foto
        html5QrCodeRef.current = new Html5Qrcode("reader");

        const config = {
          fps: 10, // Gw naikin dikit biar scannya lebih cepet responsif (gak patah-patah)
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Ini rumus biar bentuknya SELALU KOTAK SEMPURNA (mengikuti lebar layar, tapi disisain margin)
            const minEdgePercentage = 0.7; // 70% dari ukuran layar terkecil
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
            return {
              width: qrboxSize,
              height: qrboxSize,
            };
          },
          disableFlip: false, // Ubah jadi false biar kamera depan/belakang aman
        };

        html5QrCodeRef.current
          .start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              console.log("QR Code Scanned:", decodedText);
              handleSuksesScan(decodedText);
            },
            (errorMessage) => {},
          )
          .catch((err) => {
            console.error("Gagal start kamera:", err);
            setErrorMsg("Kamera tidak dapat diakses. Coba refresh halaman.");
          });
      }, 100);

      return () => {
        clearTimeout(timer);
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current
            .stop()
            .then(() => html5QrCodeRef.current.clear())
            .catch((err) => console.error("Cleanup error", err));
        }
      };
    }
  }, [isOpen]);

  // --- FUNGSI HELPER: KETIKA SCAN SUKSES (DARI KAMERA ATAU FOTO) ---
  const handleSuksesScan = (decodedText) => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current
        .stop()
        .then(() => {
          html5QrCodeRef.current.clear();
          setIsOpen(false);
          if (onScanResultRef.current) {
            onScanResultRef.current(decodedText.trim());
          }
        })
        .catch((err) => console.log("Stop failed", err));
    } else {
      // Kalau kameranya lagi gak nyala (hasil dari upload foto)
      html5QrCodeRef.current.clear();
      setIsOpen(false);
      if (onScanResultRef.current) {
        onScanResultRef.current(decodedText.trim());
      }
    }
  };

  // --- FUNGSI BARU: HANDLE UPLOAD FOTO ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setErrorMsg(""); // Bersihin error sebelumnya
      // Panggil fitur .scanFile() dari mesin Html5Qrcode
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      console.log("QR Code dari Galeri:", decodedText);
      handleSuksesScan(decodedText);
    } catch (err) {
      console.error("Gagal scan file:", err);
      setErrorMsg("QR Code tidak ditemukan pada gambar tersebut.");
    } finally {
      // Reset input file biar user bisa klik gambar yang sama lagi kalau error
      event.target.value = "";
    }
  };

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
            <div className="w-full h-[300px] bg-slate-100 rounded-lg overflow-hidden relative">
              <div
                id="reader"
                className="w-full h-full absolute inset-0 z-10"
              ></div>

              {!errorMsg && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 z-0 pointer-events-none">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 w-full bg-red-50 text-red-600 text-sm rounded flex items-center gap-2 z-10 relative">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {!errorMsg && (
              <p className="text-sm text-muted-foreground mt-4 text-center z-10 relative">
                Arahkan kamera ke QR Code di struk.
              </p>
            )}

            {/* --- TOMBOL UPLOAD FOTO BARU --- */}
            <div className="w-full mt-4 flex items-center gap-2">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="text-xs text-slate-400">ATAU</span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            <Button
              variant="secondary"
              className="w-full mt-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-4 h-4 mr-2" /> Upload dari Galeri
            </Button>

            {/* Input file disembunyikan, cuma dipanggil lewat tombol di atas */}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QRScannerAction;
