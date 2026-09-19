import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/** Statik uretilen menu sayfalari dahil her istekte masa oturumunu dogrula. */
async function masaOturumuGecerli(request: NextRequest): Promise<boolean> {
  const deger = request.cookies.get("royal_masa_oturumu")?.value ?? "";
  const eslesme = /^v1\.(\d{1,2})\.(\d{10})\.([0-9a-f]{64})$/.exec(deger);
  if (!eslesme || !/^(?:[1-9]|1[0-5])$/.test(eslesme[1])) return false;
  if (Number(eslesme[2]) <= Math.floor(Date.now() / 1000)) return false;
  const sir = process.env.MASA_QR_SECRET || process.env.SIPARIS_MAKBUZ_SECRET;
  if (!sir) return false;
  const anahtar = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sir),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const imza = await crypto.subtle.sign(
    "HMAC",
    anahtar,
    new TextEncoder().encode(`royal-masa-oturum:v1.${eslesme[1]}.${eslesme[2]}`),
  );
  const beklenen = Array.from(new Uint8Array(imza), (b) => b.toString(16).padStart(2, "0")).join("");
  return beklenen === eslesme[3];
}

/**
 * Admin panelini korur ve Supabase oturumunu tazeler.
 *
 * /admin Turkce tek dilli oldugu icin next-intl yonlendirmesinin disinda
 * tutuluyor; oraya dil oneki eklenmemeli.
 */
async function adminKorumasi(request: NextRequest) {
  const yanit = NextResponse.next({ request });

  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cerezler) => {
          cerezler.forEach(({ name, value, options }) =>
            yanit.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() oturumu sunucuda dogrular; getSession() cerezi dogrulamaz.
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: adminMi, error: adminHatasi } = user
    ? await db.rpc("is_admin")
    : { data: false, error: null };
  if (adminHatasi) console.error("Admin yetkisi dogrulanamadi:", adminHatasi.message);

  const yol = request.nextUrl.pathname;
  const girisSayfasi = yol === "/admin/giris";

  const yetkili = Boolean(user && adminMi && !adminHatasi);

  if (!yetkili && !girisSayfasi) {
    const hedef = request.nextUrl.clone();
    hedef.pathname = "/admin/giris";
    // Giristen sonra istenen sayfaya donmek icin
    hedef.searchParams.set("devam", yol);
    if (user) hedef.searchParams.set("yetki", "yok");
    return NextResponse.redirect(hedef);
  }

  if (yetkili && girisSayfasi) {
    const hedef = request.nextUrl.clone();
    hedef.pathname = "/admin";
    hedef.search = "";
    return NextResponse.redirect(hedef);
  }

  return yanit;
}

export default async function middleware(request: NextRequest) {
  const menuEslesmesi = /^\/(tr|ar)\/menu(?:\/|$)/.exec(request.nextUrl.pathname);
  if (menuEslesmesi && !(await masaOturumuGecerli(request))) {
    return NextResponse.redirect(new URL(`/${menuEslesmesi[1]}`, request.url));
  }
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return adminKorumasi(request);
  }
  if (request.nextUrl.pathname.startsWith("/masa/")) {
    return NextResponse.next();
  }
  return intlMiddleware(request);
}

export const config = {
  // Statik dosyalar ve API disindaki tum yollar
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
