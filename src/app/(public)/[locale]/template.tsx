import type { ReactNode } from "react";

/**
 * Sayfa gecis animasyonu.
 *
 * template.tsx her gezinmede yeniden baglanir, boylece animasyon her sayfa
 * degisiminde bastan oynar (layout.tsx bunu yapmaz, o kalicidir).
 *
 * DIKKAT: burada transform KULLANILMAZ. transform, alt agactaki
 * position:fixed ogeler icin yeni bir kapsayici blok yaratir; sepet cubugu
 * ve alt butonlar sayfanin ortasina kayardi. Sadece opacity animasyonu
 * boyle bir yan etki uretmiyor.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="sayfa-gecis">{children}</div>;
}
