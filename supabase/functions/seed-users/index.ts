import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const users = [
    { email: "admin@portalcomercial.com", password: "admin123", nome: "Neto", perfil: "Admin" },
    { email: "andreia@portalcomercial.com", password: "admin123", nome: "Andréia Mirelli", perfil: "Admin" },
  ];

  const results = [];

  for (const u of users) {
    // Check if user exists
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const found = existing?.users?.find((x: any) => x.email === u.email);
    
    if (found) {
      // Ensure perfil exists
      await supabaseAdmin.from("perfis").upsert({
        id: found.id,
        nome: u.nome,
        email: u.email,
        perfil: u.perfil,
        status: "Ativo",
      });
      results.push({ email: u.email, status: "already exists, perfil synced" });
      continue;
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });

    if (error) {
      results.push({ email: u.email, error: error.message });
      continue;
    }

    await supabaseAdmin.from("perfis").insert({
      id: data.user.id,
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      status: "Ativo",
    });

    results.push({ email: u.email, status: "created" });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { "Content-Type": "application/json" },
  });
});
