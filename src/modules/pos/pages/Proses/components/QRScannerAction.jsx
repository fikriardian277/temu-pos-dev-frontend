import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { QrCode, Loader2 } from "lucide-react";
import { toast } from "sonner";

const QRScannerAction = ({ onScanResult }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    let scanner;
    if (isOpen) {
      // Delay dikit biar DOM modal render dulu
      const timer = setTimeout(() => {
        scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            // SUKSES SCAN
            console.log("QR Code Scanned:", decodedText);
            scanner.clear();
            setIsOpen(false);
            onScanResult(decodedText); // Lempar kode ke parent
          },
          (errorMessage) => {
            // Error scanning biasa (abaikan biar gak spam console)
          }
        );
        setIsScanning(true);
      }, 100);
      return () => clearTimeout(timer);
    }

    return () => {
      if (scanner) {
        scanner
          .clear()
          .catch((error) => console.error("Failed to clear scanner", error));
      }
    };
  }, [isOpen, onScanResult]);

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <QrCode className="w-4 h-4 mr-2" /> Scan QR
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Struk Cucian</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4">
            <div
              id="reader"
              className="w-full h-[300px] bg-slate-100 rounded-lg overflow-hidden"
            ></div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Arahkan kamera ke QR Code di struk.
              <br />
              Pastikan cahaya cukup terang.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QRScannerAction;
