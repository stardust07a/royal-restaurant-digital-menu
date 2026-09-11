import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Sunucu bilesenleri icin oturumlu Supabase istemcisi.
 * Cerezden okudugu oturum sayesinde admin sayfalari "authenticated" rolunde
 * calisir; yazma politikalari ayrica kullanicinin admin_kullanicilar
 * allowlist'inde bulunmasini ister.
 */
export async function sunucuIstemcisi() {
  const cerezDeposu = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cerezDeposu.getAll(),
        setAll: (cerezler) => {
          try {
            cerezler.forEach(({ name, value, options }) =>
              cerezDeposu.set(name, value, options),
            );
          } catch {
            // Sunucu bileseninden cerez yazilamaz; oturumu middleware tazeliyor.
          }
        },
      },
    },
  );
}

/** Giris yapmis kullanici; yoksa null. */
export async function oturumdakiKullanici() {
  const db = await sunucuIstemcisi();
  const {
    data: { user },
  } = await db.auth.getUser();
  return user;
}
