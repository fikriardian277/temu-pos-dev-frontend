// supabase/functions/create-staff/index.ts

import { createClient } from "jsr:@supabase/supabase-js@^2.43.5";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, role, branch_id, business_id } =
      await req.json();

    if (!business_id) {
      throw new Error("business_id wajib ada di dalam request body.");
    }

    if (!email || !password || !full_name || !role) {
      throw new Error("Email, password, nama lengkap, dan role wajib diisi.");
    }
    if ((role === "admin" || role === "kasir") && !branch_id) {
      throw new Error("Admin dan Kasir wajib memiliki cabang (branch_id).");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // LANGKAH 1: Buat user di Auth. Ini akan memicu trigger otomatis.
    const { data: newUserData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name,
          role: role,
          branch_id: branch_id, // <-- TAMBAHKAN INI
          business_id: business_id, // <-- TAMBAHKAN INI JUGA BIAR LENGKAP
        },
      });

    if (authError) throw authError;

    // LANGKAH 2 (PERUBAHAN KUNCI): BUKAN .insert(), TAPI .update()
    // Kita melengkapi data profil yang sudah otomatis dibuatkan oleh trigger.
    const { error: profileError } = await supabaseAdmin
      .from("profiles") // <-- Jangan lupa .from('profiles') juga ya
      .insert({
        id: newUserData.user.id, // <-- ID-nya sudah ada di sini
        full_name: full_name,
        email: email,
        role: role,
        branch_id: branch_id,
        business_id: business_id,
      });

    if (profileError) {
      // Jika insert gagal, hapus user auth yang baru dibuat agar bersih
      await supabaseAdmin.auth.admin.deleteUser(newUserData.user.id);
      throw profileError;
    }

    return new Response(
      JSON.stringify({ message: `Staff ${role} berhasil dibuat!` }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
