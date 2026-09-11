import { readFileSync } from "node:fs";
import { join } from "node:path";

function anahtarlar(deger, yol = "", sonuc = []) {
  for (const anahtar of Object.keys(deger).sort()) {
    const tam = yol ? `${yol}.${anahtar}` : anahtar;
    const alt = deger[anahtar];
    if (alt && typeof alt === "object" && !Array.isArray(alt)) {
      anahtarlar(alt, tam, sonuc);
    } else {
      sonuc.push(tam);
    }
  }
  return sonuc;
}

const kok = process.cwd();
const oku = (dil) => JSON.parse(readFileSync(join(kok, "messages", `${dil}.json`), "utf8"));
const tr = anahtarlar(oku("tr"));
const ar = anahtarlar(oku("ar"));
const trSet = new Set(tr);
const arSet = new Set(ar);
const yalnizTr = tr.filter((anahtar) => !arSet.has(anahtar));
const yalnizAr = ar.filter((anahtar) => !trSet.has(anahtar));

if (yalnizTr.length || yalnizAr.length) {
  console.error(`Çeviri anahtarları eşleşmiyor. Yalnız TR: ${yalnizTr.join(", ") || "-"}`);
  console.error(`Yalnız AR: ${yalnizAr.join(", ") || "-"}`);
  process.exit(1);
}
console.log(`Çeviri anahtarları eşit: TR ${tr.length}, AR ${ar.length}.`);
