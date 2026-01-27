import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import QRCode from "react-qr-code"; // <-- Pastikan udah install ini

const Struk = React.forwardRef(({ transaksi, pengaturan }, ref) => {
  const [identityData, setIdentityData] = useState(null);
  const [loadingIdentity, setLoadingIdentity] = useState(false);

  // --- 1. DETEKSI TIPE DOKUMEN ---
  const isDeliveryNote = transaksi?.is_delivery_note === true;
  const isHotel = isDeliveryNote || transaksi?.tipe_order === "hotel";

  // --- 2. FETCH IDENTITAS (Header Struk) ---
  useEffect(() => {
    // ... logic fetch identitas (sama seperti sebelumnya) ...
    console.log("DEBUG Struk - Menerima Transaksi:", transaksi);
    setIdentityData(null);
    setLoadingIdentity(false);

    const customerData = transaksi?.customers;
    const identityId = customerData?.id_identitas_bisnis;
    const businessId = transaksi?.business_id;

    if (customerData?.prefetched_identity) {
      setIdentityData(customerData.prefetched_identity);
      return;
    }

    if (identityId && businessId) {
      const fetchIdentity = async () => {
        setLoadingIdentity(true);
        try {
          const { data, error } = await supabase
            .from("identitas_bisnis")
            .select("*")
            .eq("id", identityId)
            .eq("business_id", businessId)
            .maybeSingle();
          if (error) throw error;
          setIdentityData(data);
        } catch (error) {
          console.error("Gagal fetch identitas:", error);
        } finally {
          setLoadingIdentity(false);
        }
      };
      fetchIdentity();
    }
  }, [transaksi]);

  if (!transaksi) return null;

  // --- 3. HELPER FUNCTIONS ---
  const safePengaturan = pengaturan || {};
  const formatRupiah = (value) => Number(value ?? 0).toLocaleString("id-ID");

  const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return "-";
    const options = includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      : { day: "2-digit", month: "long", year: "numeric" };
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("id-ID", options);
    } catch (e) {
      return "-";
    }
  };

  return (
    <div
      ref={ref}
      className={`bg-white text-black font-mono text-[11px] w-[220px] mx-auto p-1 leading-tight ${
        isHotel ? "hotel-struk struk-container" : "struk-container"
      }`}
    >
      {/* ================= HEADER ================= */}
      <div className="text-center mb-1">
        {loadingIdentity ? (
          <p className="text-[9px]">Memuat info...</p>
        ) : (
          <>
            {!isHotel &&
              safePengaturan.show_header_on_receipt &&
              safePengaturan.show_logo_on_receipt &&
              safePengaturan.logo_url && (
                <img
                  src={safePengaturan.logo_url}
                  alt="Logo"
                  className="h-10 w-auto mx-auto mb-1"
                />
              )}

            {identityData ? (
              <>
                <h1 className="font-bold text-[12px] uppercase">
                  {identityData.nama_tampil_struk}
                </h1>
                {identityData.alamat_struk && (
                  <p className="text-[9px]">{identityData.alamat_struk}</p>
                )}
                {identityData.telepon_struk && (
                  <p className="text-[9px]">
                    Telp: {identityData.telepon_struk}
                  </p>
                )}
              </>
            ) : (
              safePengaturan.show_header_on_receipt && (
                <>
                  <h1 className="font-bold text-[12px] uppercase">
                    {safePengaturan.business_name || "Nama Usaha"}
                  </h1>
                  <p className="text-[9px]">
                    {transaksi.branches?.address || "Alamat Cabang"}
                  </p>
                  <p className="text-[9px]">
                    Telp: {transaksi.branches?.phone_number || "-"}
                  </p>
                </>
              )
            )}
          </>
        )}
      </div>

      <hr className="border-dashed border-t border-black my-1" />

      {/* ================= INFO TRANSAKSI ================= */}
      <div className="space-y-[2px]">
        <div className="text-center font-bold text-[12px] mb-1">
          {isDeliveryNote ? "SURAT JALAN" : "STRUK PEMBAYARAN"}
        </div>

        <div className="total-row">
          <span>No:</span>
          <span>{transaksi.invoice_code}</span>
        </div>

        {isDeliveryNote ? (
          <>
            <div className="total-row">
              <span>Tgl Pickup:</span>
              <span>{formatDate(transaksi.pickup_date, false)}</span>
            </div>
            <div className="total-row">
              <span>Tgl Antar:</span>
              <span>{formatDate(transaksi.created_at, false)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="total-row">
              <span>Tanggal:</span>
              <span>{formatDate(transaksi.created_at, true)}</span>
            </div>
            {transaksi.estimated_completion_date && (
              <div className="total-row">
                <span>Selesai:</span>
                <span>
                  {formatDate(transaksi.estimated_completion_date, true)}
                </span>
              </div>
            )}
          </>
        )}

        <div className="text-center my-1 pt-1 border-t border-dashed border-black">
          <span className="font-bold text-[13px] uppercase">
            {transaksi.customers?.name || "PELANGGAN UMUM"}
          </span>
        </div>
      </div>

      <hr className="border-dashed border-t border-black my-1" />

      {/* ================= ITEM LIST ================= */}
      {isDeliveryNote ? (
        <div className="mt-1 mb-1 text-[10px]">
          <div className="flex font-bold border-b border-black pb-1 mb-1">
            <div className="flex-1">Nama Item</div>
            <div className="w-8 text-right">Qty</div>
            <div className="w-8 text-right">Sat</div>
          </div>
          {transaksi.order_items?.map((item, idx) => (
            <div key={idx} className="flex mb-1">
              <div className="flex-1 pr-1">{item.packages?.name || "Item"}</div>
              <div className="w-8 text-right font-bold">{item.quantity}</div>
              <div className="w-8 text-right text-[9px]">
                {item.packages?.unit || "pcs"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {transaksi.order_items?.map((item) => (
            <div key={item.id} className="mb-[3px]">
              <p className="font-semibold">
                {item.packages?.services?.name
                  ? `${item.packages.services.name} - `
                  : ""}
                {item.packages?.name || "N/A"}
              </p>
              <div className="total-row">
                <span>
                  {item.quantity} {item.packages?.unit || "pcs"} ×{" "}
                  {formatRupiah(item.packages?.price || 0)}
                </span>
                <span>Rp{formatRupiah(item.subtotal)}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ================= TOTAL & FOOTER ================= */}
      {!isDeliveryNote && (
        <>
          <hr className="border-dashed border-t border-black my-1" />
          <div className="space-y-[2px]">
            {/* Subtotal */}
            <div className="total-row">
              <span>Subtotal</span>
              <span>Rp{formatRupiah(transaksi.subtotal)}</span>
            </div>

            {/* Biaya Tambahan (Layanan / Membership) */}
            {(Number(transaksi.service_fee) > 0 ||
              Number(transaksi.membership_fee_paid) > 0) && (
              <div className="total-row">
                <span>Biaya Lain</span>
                <span>
                  Rp
                  {formatRupiah(
                    (Number(transaksi.service_fee) || 0) +
                      (Number(transaksi.membership_fee_paid) || 0)
                  )}
                </span>
              </div>
            )}

            {/* 👇 DISKON (UPDATE BARU) 👇 */}
            {Number(transaksi.discount_amount) > 0 && (
              <div className="total-row">
                <span>Diskon</span>
                <span>(Rp{formatRupiah(transaksi.discount_amount)})</span>
              </div>
            )}
            {/* 👆 SELESAI UPDATE DISKON 👆 */}

            {/* Grand Total */}
            <div className="total-row font-bold text-[11px] mt-1 pt-1 border-t border-dashed border-black">
              <span>TOTAL</span>
              <span>Rp{formatRupiah(transaksi.grand_total)}</span>
            </div>

            <div className="text-center mt-2 text-[9px]">
              Status: {transaksi.payment_status} ({transaksi.payment_method})
            </div>
          </div>
        </>
      )}

      {transaksi.notes && (
        <div className="mt-2 pt-1 border-t border-dashed border-black">
          <p className="font-bold">Catatan:</p>
          <p className="text-[9px] italic">"{transaksi.notes}"</p>
        </div>
      )}

      {isDeliveryNote && (
        <div className="mt-6 flex justify-between text-center text-[9px]">
          <div>
            <p>Pengirim,</p>
            <br />
            <br />
            <p>(...................)</p>
          </div>
          <div>
            <p>Penerima,</p>
            <br />
            <br />
            <p>(...................)</p>
          </div>
        </div>
      )}

      {/* 2. Footer Teks "Terima Kasih" (KHUSUS REGULER) */}
      {!isDeliveryNote && (
        <p className="mt-4 text-[9px] italic text-center border-b border-dashed border-black/30 pb-2 mb-2">
          {identityData?.footer_struk ||
            safePengaturan.receipt_footer_text ||
            "Terima Kasih!"}
        </p>
      )}

      {/* 3. QR CODE (PINDAH KE SINI - PALING BAWAH) */}
      {!isDeliveryNote && (
        <div className="flex flex-col items-center justify-center pb-2">
          <QRCode
            value={transaksi.invoice_code}
            size={70} // Ukuran sedikit diperkecil biar manis di footer
            style={{ height: "auto", maxWidth: "100%", width: "70px" }}
            viewBox={`0 0 256 256`}
          />
          <p className="text-[8px] text-center mt-1 uppercase tracking-wider">
            Scan Order
          </p>
        </div>
      )}

      <br />
    </div>
  );
});

export default Struk;
