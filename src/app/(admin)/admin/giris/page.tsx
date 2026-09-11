import { Suspense } from "react";
import GirisFormu from "@/components/admin/GirisFormu";

export default function GirisSayfasi() {
  return (
    <main id="admin-ana-icerik" className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-accent/40 bg-card text-2xl font-bold text-accent">
        R
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
