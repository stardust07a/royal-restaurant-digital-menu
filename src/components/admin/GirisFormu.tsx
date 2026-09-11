"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { tarayiciIstemcisi } from "@/lib/supabase-tarayici";
import { useAdminDil } from "@/lib/admin-dil";

export default function GirisFormu() {
  const { m } = useAdminDil();
  const router = useRouter();
  const parametreler = useSearchParams();
  const [eposta, setEposta] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBekliyor(true);

    try {
      const db = tarayiciIstemcisi();
      const { error } = await db.auth.signInWithPassword({
        email: eposta.trim(),
        password: sifre,
      });

      if (error) {
        console.error("Admin girisi basarisiz:", error);
        setHata(error.status === 400 ? m("girisHatali") : m("girisHatasi"));
        setBekliyor(false);
        return;
      }

      const devam = parametreler.get("devam");
      router.replace(devam && devam.startsWith("/admin") ? devam : "/admin");
      router.refresh();
    } catch (error) {
      console.error("Admin girisi tamamlanamadi:", error);
      setHata(m("girisHatasi"));
      setBekliyor(false);
    }
  }

  return (
    <form onSubmit={gonder} className="mt-1 flex w-full max-w-sm flex-col gap-3">
      <p className="mb-6 text-center text-sm text-muted">
        {m("girisBaslik")}
      </p>

      {parametreler.get("yetki") === "yok" && (
        <p role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
          {m("adminYetkisiYok")}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">{m("eposta")}</span>
        <input
          type="email"
          name="email"
          value={eposta}
          onChange={(e) => setEposta(e.target.value)}
          autoComplete="username"
          inputMode="email"
          spellCheck={false}
          required
          className="min-h-12 rounded-2xl border border-line bg-card px-4 text-base focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">{m("sifre")}</span>
        <input
          type="password"
          name="password"
          value={sifre}
          onChange={(e) => setSifre(e.target.value)}
          autoComplete="current-password"
          spellCheck={false}
          required
          className="min-h-12 rounded-2xl border border-line bg-card px-4 text-base focus:border-brand"
        />
      </label>

      {hata && (
        <p
          role="alert"
          className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          {hata}
        </p>
      )}

      <button
        type="submit"
        disabled={bekliyor}
        className="mt-2 flex min-h-13 items-center justify-center rounded-2xl bg-brand font-bold text-bg transition active:scale-[0.98] disabled:bg-line disabled:text-muted"
      >
        {bekliyor ? m("girisYapiliyor") : m("girisYap")}
      </button>
    </form>
  );
}
