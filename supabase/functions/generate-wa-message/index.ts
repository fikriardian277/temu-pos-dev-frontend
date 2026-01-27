// supabase/functions/generate-wa-message/index.ts (VERSI MASAK MANUAL & LENGKAP)

import { corsHeaders } from "../_shared/cors.ts";

// Ambil "Kunci Sakti" dari environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

// Fungsi helper kecil buat format Rupiah
const formatRupiah = (value: any) => {
  return "Rp" + Number(value ?? 0).toLocaleString("id-ID");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = `Bearer ${serviceRoleKey}`;
    const headers = {
      Authorization: authHeader,
      apikey: anonKey!,
    };

    const { invoice_code, tipe_pesan } = await req.json();
    if (!invoice_code || !tipe_pesan) {
      throw new Error("Parameter 'invoice_code' dan 'tipe_pesan' wajib ada.");
    }

    // 3. Ambil ID Bisnis dari 'KTP' user
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: req.headers.get("Authorization")!,
        apikey: anonKey!,
      },
    });
    if (!authResponse.ok) throw new Error("Gagal memvalidasi token pengguna.");
    const user = await authResponse.json();
    const business_id = user?.user_metadata?.business_id;
    if (!business_id)
      throw new Error("ID Bisnis tidak ditemukan di token pengguna.");

    // 4. Ambil data order & relasinya (Pake 'fetch' manual)
    //    INI DIA UPGRADE-NYA: Kita ambil order_items dan packages juga
    const orderResponse = await fetch(
      `${supabaseUrl}/rest/v1/orders?select=*,customers(name,phone_number),branches(name),order_items(*,packages(*))&invoice_code=eq.${invoice_code}&business_id=eq.${business_id}&limit=1`,
      { headers }
    );
    if (!orderResponse.ok) throw new Error("Gagal mengambil data order.");
    const orderDataArr = await orderResponse.json();
    if (!orderDataArr || orderDataArr.length === 0)
      throw new Error(`Invoice ${invoice_code} tidak ditemukan.`);
    const orderData = orderDataArr[0];

    // 5. Ambil data settings (Pake 'fetch' manual)
    const settingsResponse = await fetch(
      `${supabaseUrl}/rest/v1/settings?select=*&business_id=eq.${business_id}&limit=1`,
      { headers }
    );
    if (!settingsResponse.ok) throw new Error("Gagal mengambil data settings.");
    const settingsDataArr = await settingsResponse.json();
    if (!settingsDataArr || settingsDataArr.length === 0)
      throw new Error(`Pengaturan untuk bisnis ini tidak ditemukan.`);
    const settings = settingsDataArr[0];

    // 6. Rangkai pesan (Logika ini SAMA PERSIS kayak versi 'createClient')
    let pesan = "";
    if (tipe_pesan === "struk") {
      const header = settings.wa_template_header || "";
      const pembuka = (settings.wa_template_receipt_opening || "").replace(
        "{nama_pelanggan}",
        orderData.customers.name
      );
      const penutup = settings.wa_template_receipt_closing || "";

      // --- RANGKAI DETAIL STRUK (VERSI LENGKAP) ---
      let rincianItems = orderData.order_items
        .map((item: any) => {
          return `${item.packages.name}\n${item.quantity} ${
            item.packages.unit
          } x ${formatRupiah(item.packages.price)} = ${formatRupiah(
            item.subtotal
          )}`;
        })
        .join("\n\n");

      if (orderData.membership_fee_paid > 0) {
        rincianItems += `\n\nBiaya Upgrade Membership\n1 pcs x ${formatRupiah(
          orderData.membership_fee_paid
        )} = ${formatRupiah(orderData.membership_fee_paid)}`;
      }

      const rincianTotal = [
        `\n---------------------------------`,
        `Subtotal: ${formatRupiah(
          orderData.subtotal + orderData.membership_fee_paid
        )}`,
        orderData.service_fee > 0
          ? `Biaya Layanan: ${formatRupiah(orderData.service_fee)}`
          : null,
        orderData.discount_amount > 0
          ? `Diskon Poin: -${formatRupiah(orderData.discount_amount)}`
          : null,
        `GRAND TOTAL: ${formatRupiah(orderData.grand_total)}`,
        `Status: ${orderData.payment_status} (${
          orderData.payment_method || "-"
        })`,
      ]
        .filter(Boolean)
        .join("\n");

      const infoPoin =
        settings.points_scheme !== "nonaktif"
          ? [
              `\n---------------------------------`,
              `-- Info Poin --`,
              `Poin Ditukar: -${orderData.points_redeemed}`,
              `Poin Didapat: +${orderData.points_earned}`,
              `Total Poin: ${orderData.customers.points}`,
            ].join("\n")
          : "";
      // --- AKHIR RANGKAIAN ---

      pesan = `${header}\n\n${pembuka}\n\n${rincianItems}\n${rincianTotal}\n${infoPoin}\n\n${penutup}`;
    } else if (tipe_pesan === "siap_diambil") {
      const pembuka = settings.wa_template_ready_opening || "";
      const penutup = settings.wa_template_ready_closing || "";
      pesan = `${pembuka
        .replace("{nama_pelanggan}", orderData.customers.name)
        .replace("{kode_invoice}", orderData.invoice_code)}\n\n${penutup}`;
    } else {
      throw new Error(`Tipe pesan '${tipe_pesan}' tidak valid.`);
    }

    // 7. Kirim balasan sukses
    return new Response(
      JSON.stringify({ pesan, nomor_hp: orderData.customers.phone_number }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
