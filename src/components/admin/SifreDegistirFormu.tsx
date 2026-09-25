"use client";

import { useState } from "react";
import { tarayiciIstemcisi } from "@/lib/supabase-tarayici";
import { useAdminDil } from "@/lib/admin-dil";

export default function SifreDegistirFormu() {
  const { m } = useAdminDil();
  const [mevcutSifre, setMevcutSifre] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [tekrar, setTekrar] = useState("");
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);

  async function gonder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setHata(null);
    setMesaj(null);

    if (yeniSifre.length < 10) {
      setHata(m("sifreEnAzOn"));
      return;
    }
    if (yeniSifre !== tekrar) {
      setHata(m("sifrelerEslesmiyor"));
      return;
    }

    setBekliyor(true);
    try {
      const db = tarayiciIstemcisi();
      const { data: kullaniciSonucu, error: kullaniciHatasi } =
        await db.auth.getUser();
      const eposta = kullaniciSonucu.user?.email;
      if (kullaniciHatasi || !eposta) throw kullaniciHatasi ?? new Error("Kullanıcı bulunamadı");

      const { error: dogrulamaHatasi } = await db.auth.signInWithPassword({
        email: eposta,
        password: mevcutSifre,
      });
      if (dogrulamaHatasi) {
        setHata(m("mevcutSifreHatali"));
        return;
      }

      const { error: guncellemeHatasi } = await db.auth.updateUser({
        password: yeniSifre,
      });
      if (guncellemeHatasi) throw guncellemeHatasi;

      setMevcutSifre("");
      setYeniSifre("");
      setTekrar("");
      setMesaj(m("sifreDegistirildi"));
    } catch (error) {
      console.error("Admin şifresi değiştirilemedi:", error);
      setHata(m("sifreDegistirilemedi"));
    } finally {
      setBekliyor(false);
    }
  }

  const alanSinifi =
    "min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base focus:border-brand";

  return (
    <section className="mt-6 border-t border-line pt-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-accent">
        {m("sifreDegistir")}
      </h2>
      <form onSubmit={gonder} className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">{m("mevcutSifre")}</span>
          <input
            type="password"
            name="current-password"
            value={mevcutSifre}
            onChange={(e) => setMevcutSifre(e.target.value)}
            autoComplete="current-password"
            required
            className={alanSinifi}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">{m("yeniSifre")}</span>
          <input
            type="password"
            name="new-password"
            value={yeniSifre}
            onChange={(e) => setYeniSifre(e.target.value)}
            autoComplete="new-password"
            minLength={10}
            required
            className={alanSinifi}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">{m("yeniSifreTekrar")}</span>
          <input
            type="password"
            name="new-password-confirmation"
            value={tekrar}
            onChange={(e) => setTekrar(e.target.value)}
            autoComplete="new-password"
            minLength={10}
            required
            className={alanSinifi}
          />
        </label>

        {hata && (
          <p role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            {hata}
          </p>
        )}
        {mesaj && (
          <p role="status" aria-live="polite" className="rounded-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-brand">
            {mesaj}
          </p>
        )}

        <button
          type="submit"
          disabled={bekliyor}
          className="flex min-h-12 items-center justify-center rounded-2xl border border-brand font-bold text-brand transition active:scale-[0.98] disabled:opacity-50"
        >
          {bekliyor ? m("sifreDegistiriliyor") : m("sifreDegistir")}
        </button>
      </form>
    </section>
  );
}
