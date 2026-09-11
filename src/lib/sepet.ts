"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SepetKalemi } from "./tipler";
import { kurus } from "./sabitler";
import { uuidV4Uret } from "./uuid";

/** localStorage anahtari. Degistirilirse mevcut sepetler sifirlanir. */
const DEPO_ANAHTARI = "royal_sepet";

/**
 * Sepet satirlari icin benzersiz kimlik.
 *
 * crypto.randomUUID SADECE guvenli baglamda (https veya localhost) tanimlidir.
 * Telefondan yerel aga baglanildiginda (http://10.x.x.x:3000) undefined gelir
 * ve "Sepete Ekle" cokerdi. crypto.getRandomValues guvensiz baglamda da
 * calisir; o da yoksa zaman + rastgele sayiya duseriz.
 *
 * Bu kimlik yalnizca sepet satirlarini birbirinden ayirmak icin kullaniliyor,
 * guvenlik degeri tasimiyor.
 */
function satirIdUret(): string {
  return uuidV4Uret();
}

interface SepetDurumu {
  /** Sepetin turu: masa menusu mu paket siparis mi */
  tur: "masa" | "paket";
  kalemler: SepetKalemi[];
  ekle: (kalem: Omit<SepetKalemi, "satirId">, tur: "masa" | "paket") => void;
  adetAyarla: (satirId: string, adet: number) => void;
  sil: (satirId: string) => void;
  temizle: () => void;
}

/**
 * Ayni urunun farkli secimlerle eklenmis hallerini ayirt eden imza.
 * Iki satir ayni urun + ayni cikarilanlar + ayni ekstralar + ayni notsa
 * yeni satir acmak yerine adedi artirilir.
 */
function imza(kalem: Omit<SepetKalemi, "satirId">): string {
  const cikarilan = [...kalem.cikarilanlar.map((c) => c.id)].sort().join(",");
  const ekstra = [...kalem.ekstralar.map((e) => e.id)].sort().join(",");
  return `${kalem.urunId}|${cikarilan}|${ekstra}|${kalem.not.trim()}`;
}

export const useSepet = create<SepetDurumu>()(
  persist(
    (set) => ({
      tur: "paket",
      kalemler: [],

      ekle: (yeni, tur) =>
        set((durum) => {
          // Tur degistiyse eski sepet gecersiz: masa ve paket fiyatlari farkli,
          // ikisi ayni sepette karisirsa yanlis tutar cikar.
          if (durum.tur !== tur) {
            return { tur, kalemler: [{ ...yeni, satirId: satirIdUret() }] };
          }
          const yeniImza = imza(yeni);
          const mevcut = durum.kalemler.find((k) => imza(k) === yeniImza);

          if (mevcut) {
            return {
              kalemler: durum.kalemler.map((k) =>
                k.satirId === mevcut.satirId
                  ? { ...k, adet: k.adet + yeni.adet }
                  : k,
              ),
            };
          }

          return {
            kalemler: [...durum.kalemler, { ...yeni, satirId: satirIdUret() }],
          };
        }),

      adetAyarla: (satirId, adet) =>
        set((durum) => ({
          // Adet 0'a dusunce satir kendiliginden silinir
          kalemler:
            adet <= 0
              ? durum.kalemler.filter((k) => k.satirId !== satirId)
              : durum.kalemler.map((k) =>
                  k.satirId === satirId ? { ...k, adet } : k,
                ),
        })),

      sil: (satirId) =>
        set((durum) => ({
          kalemler: durum.kalemler.filter((k) => k.satirId !== satirId),
        })),

      temizle: () => set({ kalemler: [] }),
    }),
    {
      name: DEPO_ANAHTARI,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Tek satirin birim fiyati = urun fiyati + secili ekstralar. */
export function satirBirimFiyati(kalem: SepetKalemi): number {
  const ekstraToplami = kalem.ekstralar.reduce(
    (t, e) => kurus(t + e.fiyat),
    0,
  );
  return kurus(kalem.birimFiyat + ekstraToplami);
}

/** Tek satirin toplami = birim fiyat x adet. */
export function satirToplami(kalem: SepetKalemi): number {
  return kurus(satirBirimFiyati(kalem) * kalem.adet);
}

/** Sepetteki tum satirlarin toplami (paket teslimat ucreti haric). */
export function araToplamHesapla(kalemler: SepetKalemi[]): number {
  return kurus(kalemler.reduce((t, k) => kurus(t + satirToplami(k)), 0));
}

/** Sepetteki toplam urun adedi — ust bardaki rozet icin. */
export function toplamAdet(kalemler: SepetKalemi[]): number {
  return kalemler.reduce((t, k) => t + k.adet, 0);
}
