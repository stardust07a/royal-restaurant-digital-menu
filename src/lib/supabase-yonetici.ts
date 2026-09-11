import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let istemci: SupabaseClient | null = null;

/**
 * Yalnizca guvenilir sunucu kodunda kullanilan service-role istemcisi.
 *
 * Bu anahtar RLS'yi asabildigi icin bu modulu hicbir istemci bileseninden
 * iceri aktarma. Eksik yapilandirma sessizce anon istemciye dusmez.
 */
export function yoneticiIstemcisi(): SupabaseClient {
  if (istemci) return istemci;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anahtar = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anahtar) {
    throw new Error(
      "Siparis sunucusu yapilandirilmamis: NEXT_PUBLIC_SUPABASE_URL ve " +
        "SUPABASE_SERVICE_ROLE_KEY ortam degiskenleri zorunludur.",
    );
  }

  istemci = createClient(url, anahtar, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return istemci;
}
