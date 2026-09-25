"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tarayiciIstemcisi } from "@/lib/supabase-tarayici";
import { useAdminDil } from "@/lib/admin-dil";

/** Kac saniyede bir yeni siparis kontrol edilsin. */
const KONTROL_MS = 15000;

/**
 * Yeni siparis geldiginde sesli uyari verir ve listeyi tazeler.
 *
 * Neden anket (polling), Supabase Realtime degil: Realtime icin tabloda
 * replikasyon acilmasi gerekiyor ve baglanti mutfak wifi'sinde koptugunda
 * sessizce olur. 15 saniyelik anket, tek satirlik "en yeni siparis" sorgusu
 * ile calisir; kopan baglanti bir sonraki turda kendiliginden toparlanir.
 *
 * Ses ancak kullanici sayfayla etkilesime girdikten sonra calabilir
 * (tarayici kurali). Bu yuzden once "sesi ac" dugmesi gosterilir.
 */
export default function YeniSiparisUyarisi({
  ilkSiparisNo,
}: {
  ilkSiparisNo: string | null;
}) {
  const router = useRouter();
  const { m } = useAdminDil();
  const [sesAcik, setSesAcik] = useState(false);
  const sonGorulen = useRef<string | null>(ilkSiparisNo);
  const sesBaglami = useRef<AudioContext | null>(null);

  /** Kisa bir bip — ses dosyasi yuklemeden, Web Audio ile uretiliyor. */
  function bip() {
    try {
      const Baglam =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Baglam) return;

      sesBaglami.current ??= new Baglam();
      const b = sesBaglami.current;
      if (b.state === "suspended") void b.resume();

      // Iki notali kisa bir bildirim sesi
      [0, 0.18].forEach((gecikme, i) => {
        const osc = b.createOscillator();
        const kazanc = b.createGain();
        osc.type = "sine";
        osc.frequency.value = i === 0 ? 880 : 1174;
        kazanc.gain.setValueAtTime(0.0001, b.currentTime + gecikme);
        kazanc.gain.exponentialRampToValueAtTime(
          0.3,
          b.currentTime + gecikme + 0.02,
        );
        kazanc.gain.exponentialRampToValueAtTime(
          0.0001,
          b.currentTime + gecikme + 0.16,
        );
        osc.connect(kazanc).connect(b.destination);
        osc.start(b.currentTime + gecikme);
        osc.stop(b.currentTime + gecikme + 0.18);
      });
    } catch {
      // Ses cikmazsa akis bozulmasin; liste yine de tazelenir.
    }
  }

  useEffect(() => {
    if (!sesAcik) return;
    const db = tarayiciIstemcisi();
    let durduruldu = false;

    async function kontrol() {
      const { data, error } = await db
        .from("siparisler")
        .select("siparis_no")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (durduruldu || error || !data) return;

      if (sonGorulen.current && data.siparis_no !== sonGorulen.current) {
        bip();
        router.refresh();
      }
      sonGorulen.current = data.siparis_no;
    }

    const sayac = window.setInterval(kontrol, KONTROL_MS);
    return () => {
      durduruldu = true;
      clearInterval(sayac);
    };
  }, [sesAcik, router]);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
      <button
        type="button"
        onClick={() => {
          setSesAcik((a) => !a);
          if (!sesAcik) bip(); // kullanici sesi duysun + izin alinsin
        }}
        aria-pressed={sesAcik}
        className={`flex min-h-12 w-full items-center justify-center gap-2 border text-sm font-semibold transition-colors duration-200 ${
          sesAcik
            ? "border-brand bg-brand/10 text-brand"
            : "border-line text-muted hover:border-rule"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {sesAcik ? (
            <path d="M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14" />
          ) : (
            <path d="M11 5L6 9H2v6h4l5 4V5zM22 9l-6 6M16 9l6 6" />
          )}
        </svg>
        {sesAcik ? m("sesAcik") : m("sesiAc")}
      </button>
      {sesAcik && (
        <p className="mt-1 text-center text-xs text-muted">
          {m("sesAciklama")}
        </p>
      )}
    </div>
  );
}
