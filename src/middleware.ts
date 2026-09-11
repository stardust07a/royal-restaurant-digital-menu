import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

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
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return adminKorumasi(request);
  }
  return intlMiddleware(request);
}

export const config = {
  // Statik dosyalar ve API disindaki tum yollar
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
