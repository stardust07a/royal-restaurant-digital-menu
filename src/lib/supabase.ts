import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Herkese acik (anon) Supabase istemcisi.
 *
 * RLS politikalari geregi bu anahtarla sadece herkese acik menu ve ayar
 * verisi OKUNABILIR. Yazma yetkisi gerektiren isler admin panelde
 * oturum acmis kullanicinin kendi anahtariyla yapilir.
 *
 * Istemci ilk kullanimda olusturulur — ortam degiskeni eksikse hata,
 * Supabase'e dokunmayan sayfalarin derlenmesini engellemesin.
 */
let istemci: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (istemci) return istemci;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anahtar = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anahtar) {
    throw new Error(
      "Supabase ortam degiskenleri eksik. .env.local dosyasinda " +
        "NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY tanimli olmali.",
    );
  }

  istemci = createClient(url, anahtar, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return istemci;
}
