import { type NextRequest, NextResponse } from "next/server";
import {
  MASA_CEREZI,
  MASA_OTURUM_SANIYE,
  masaOturumuOlustur,
  masaQrGecerli,
} from "@/lib/masa-erisim";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ no: string }> },
) {
  const { no } = await params;
  const imza = request.nextUrl.searchParams.get("imza") ?? "";
  if (!masaQrGecerli(no, imza)) {
    return new NextResponse("Gecersiz masa QR kodu", { status: 404 });
  }
  const oturum = masaOturumuOlustur(no);
  if (!oturum) return new NextResponse("Masa erisimi kullanilamiyor", { status: 503 });

  const yanit = NextResponse.redirect(new URL("/tr/menu", request.url));
  yanit.headers.set("Cache-Control", "no-store");
  yanit.cookies.set(MASA_CEREZI, oturum, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MASA_OTURUM_SANIYE,
  });
  return yanit;
}
