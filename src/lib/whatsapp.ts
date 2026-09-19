import { fiyatYaz } from "./sabitler";
import { siparisMetniNormalize } from "./telefon";

/** Mesaj bu uzunlugu asarsa kisa bicime gecilir. */
const UZUNLUK_SINIRI = 1500;

/** Kalem satirlarinda nokta dolgusunun hedefledigi genislik. */
const SATIR_GENISLIGI = 34;

const AYRAC = "━".repeat(20);

/** Mesaj metinleri cevirilerden gelir — burada sabit Turkce metin yok. */
export type EtiketFn = (
  anahtar: string,
  degerler?: Record<string, string>,
) => string;

export interface MesajKalemi {
  /** Musterinin sectigi dildeki urun adi */
  ad: string;
  adet: number;
  /** Satir toplami: (urun + ekstralar) x adet */
  toplam: number;
  cikarilanlar: string[];
  ekstralar: { ad: string; fiyat: number }[];
  not: string;
}

export interface MesajGirdisi {
  restoranAdi: string;
  siparisNo: string;
  /** "masa" ise adres istenmez, yerine masa numarasi yazilir */
  tur?: "masa" | "paket";
  masaNo?: string;
  kalemler: MesajKalemi[];
  araToplam: number;
  servisUcreti: number;
  toplam: number;
  musteriTelefon: string;
  etiket: EtiketFn;
  tarih?: Date;
}

/**
 * "Royal Döner × 2 ........... 400 ₺"
 * Iki yaninin arasini nokta ile doldurur; toplam genislik sabit kalir.
 */
function noktali(sol: string, sag: string): string {
  const bosluk = Math.max(1, SATIR_GENISLIGI - sol.length - sag.length);
  return `${sol} ${".".repeat(bosluk)} ${sag}`;
}

/** "12.08.2026 · 19:42" — her iki dilde de Latin rakam ve ayni bicim. */
function tarihYaz(tarih: Date): string {
  const bicim = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p = bicim.formatToParts(tarih);
  const al = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${al("day")}.${al("month")}.${al("year")} · ${al("hour")}:${al("minute")}`;
}

function basliklar(g: MesajGirdisi, tarih: Date): string[] {
  return [
    `${g.restoranAdi.toLocaleUpperCase("tr-TR")} — ${g.etiket(
      g.tur === "masa" ? "masaBaslik" : "baslik",
    )}`,
    `${g.etiket("siparisNo")}: #${g.siparisNo}`,
    tarihYaz(tarih),
    "",
    AYRAC,
  ];
}

function toplamlar(g: MesajGirdisi): string[] {
  return [
    AYRAC,
    noktali(g.etiket("araToplam"), fiyatYaz(g.araToplam)),
    ...(g.tur === "masa"
      ? []
      : [noktali(g.etiket("servisUcreti"), fiyatYaz(g.servisUcreti))]),
    noktali(g.etiket("toplam"), fiyatYaz(g.toplam)),
    AYRAC,
    "",
    // Masa siparisinde telefon/adres; paket siparisinde ad alinmaz.
    ...(g.tur === "masa"
      ? [`${g.etiket("masaNo")}: ${siparisMetniNormalize(g.masaNo ?? "")}`]
      : [
          `${g.etiket("telefon")}: ${siparisMetniNormalize(g.musteriTelefon)}`,
          "",
          g.etiket("adresBaslik"),
          g.etiket("adresIstek"),
        ]),
  ];
}

/** Cikarilan ve ekstra detaylarini iceren tam bicim. */
function tamBicim(g: MesajGirdisi, tarih: Date): string {
  const satirlar = basliklar(g, tarih);

  g.kalemler.forEach((k, i) => {
    satirlar.push(
      noktali(`${i + 1}) ${siparisMetniNormalize(k.ad)} × ${k.adet}`, fiyatYaz(k.toplam)),
    );

    // Emoji YOK: bazi telefonlarda ve WhatsApp Web'de kutu olarak ciziliyordu.
    if (k.cikarilanlar.length > 0) {
      satirlar.push(`   - ${g.etiket("cikan")}: ${k.cikarilanlar.map(siparisMetniNormalize).join(", ")}`);
    }
    if (k.ekstralar.length > 0) {
      const liste = k.ekstralar
        .map((e) => `${siparisMetniNormalize(e.ad)} (+${fiyatYaz(e.fiyat)})`)
        .join(", ");
      satirlar.push(`   + ${g.etiket("ekstra")}: ${liste}`);
    }
    if (k.not.trim()) {
      satirlar.push(`   * ${g.etiket("not")}: ${siparisMetniNormalize(k.not)}`);
    }
    if (i < g.kalemler.length - 1) satirlar.push("");
  });

  return [...satirlar, ...toplamlar(g)].join("\n");
}

/**
 * Kisa bicim: sadece ad + adet + fiyat.
 * Cikarilan/ekstra detayi tek satirlik bir yonlendirmeye indirilir —
 * WhatsApp'in tek mesajda tasiyabilecegi uzunlugu asmamak icin.
 */
function kisaBicim(g: MesajGirdisi, tarih: Date): string {
  const satirlar = basliklar(g, tarih);

  g.kalemler.forEach((k, i) => {
    satirlar.push(
      noktali(`${i + 1}) ${siparisMetniNormalize(k.ad)} × ${k.adet}`, fiyatYaz(k.toplam)),
    );
  });

  const detayliVar = g.kalemler.some(
    (k) => k.cikarilanlar.length > 0 || k.ekstralar.length > 0 || k.not.trim(),
  );
  if (detayliVar) {
    satirlar.push("");
    satirlar.push(g.etiket("detaylarIcin", { no: g.siparisNo }));
  }

  return [...satirlar, ...toplamlar(g)].join("\n");
}

/** Siparis mesajini uretir; gerekirse kisa bicime duser. */
export function siparisMesaji(girdi: MesajGirdisi): string {
  const tarih = girdi.tarih ?? new Date();
  const tam = tamBicim(girdi, tarih);
  return tam.length <= UZUNLUK_SINIRI ? tam : kisaBicim(girdi, tarih);
}

/** wa.me baglantisi. Numara sadece rakam olmali (905434888828). */
export function whatsappBaglantisi(numara: string, mesaj: string): string {
  const temiz = numara.replace(/[^0-9]/g, "");
  return `https://wa.me/${temiz}?text=${encodeURIComponent(mesaj)}`;
}
