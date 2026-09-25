import { Suspense } from "react";
import GirisFormu from "@/components/admin/GirisFormu";
import { MarkaLogosuIcerigi } from "@/components/menu/MarkaLogosu";
import { ayarlariGetir } from "@/lib/ayarlar";

export default async function GirisSayfasi() {
  const ayarlar = await ayarlariGetir();

  return (
    <main id="admin-ana-icerik" className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="relative mb-8 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-accent/40 bg-card text-2xl font-bold text-accent shadow-[0_16px_40px_rgba(16,43,40,.1)]">
        <MarkaLogosuIcerigi
          logoUrl={ayarlar.logo_url}
          alt="Royal Restaurant"
          priority
          sizes="96px"
          imageClassName="object-contain p-1"
          fallbackClassName="flex flex-col items-center justify-center text-brand"
          fallbackCrownClassName="-mb-1 text-sm text-accent"
          fallbackTextClassName="text-3xl font-black leading-none"
        />
      </div>
      <h1 className="text-xl font-bold">Royal Admin</h1>

      {/* Alt baslik ve form ayni istemci bileseninde: sunucuda basilan metin
          dil secimini bilemez, Turkce kalirdi. */}
      <Suspense>
        <GirisFormu />
      </Suspense>
    </main>
  );
}
