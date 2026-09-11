"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Admin panelde kullanilan tarayici istemcisi.
 *
 * Oturum cerezde tutulur, boylece middleware ve sunucu bilesenleri de
 * ayni oturumu gorur. Yazma yetkisi buradan gelir: RLS politikalari yalniz
 * admin_kullanicilar tablosunda kayitli oturumlara izin verir.
 */
export function tarayiciIstemcisi() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
