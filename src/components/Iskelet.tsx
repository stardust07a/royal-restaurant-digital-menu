/**
 * Yukleme iskeleti.
 *
 * Kategori gecislerinde sayfa sunucuda uretildigi icin kisa bir bekleme
 * oluyordu ve ekran bos kaliyordu. Next.js bu bileseni loading.tsx uzerinden
 * aninda gosteriyor; boylece gecis "yavas" degil "yukleniyor" hissi veriyor.
 */
export function UrunIzgaraIskeleti({ adet = 6 }: { adet?: number }) {
  return (
    <ul aria-hidden className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
      {Array.from({ length: adet }).map((_, i) => (
        <li key={i} className="kart-derinlik flex flex-col overflow-hidden rounded-3xl border border-line/70 bg-card">
          <div className="parilti aspect-4/3 w-full bg-surface" />
          <div className="flex flex-col gap-2 px-3.5 py-3">
            <span className="parilti h-4 w-3/4 rounded-full bg-surface" />
            <span className="parilti h-3 w-full rounded-full bg-surface" />
            <span className="parilti mt-2 h-5 w-16 rounded-full bg-surface" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function UrunListesiIskeleti({ adet = 7 }: { adet?: number }) {
  return (
    <ul aria-hidden className="flex flex-col gap-2.5">
      {Array.from({ length: adet }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 border border-line p-3">
          <span className="parilti aspect-4/3 w-24 shrink-0 bg-surface" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="parilti h-4 w-2/3 bg-surface" />
            <span className="parilti h-3 w-full bg-surface" />
            <span className="parilti h-3 w-20 bg-surface" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Yapiskan kategori seridi yerine gecen iskelet. */
export function SeritIskeleti() {
  return (
    <div
      aria-hidden
      className="flex gap-2 overflow-hidden border-b border-line px-4 py-2"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="parilti h-11 w-24 shrink-0 bg-surface" />
      ))}
    </div>
  );
}
