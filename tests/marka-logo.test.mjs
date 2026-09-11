import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KOK = dirname(dirname(fileURLToPath(import.meta.url)));
const logo = readFileSync(
  join(KOK, "src", "components", "menu", "MarkaLogosu.tsx"),
  "utf8",
);
const anaSayfa = readFileSync(
  join(KOK, "src", "app", "(public)", "[locale]", "page.tsx"),
  "utf8",
);

test("ortak marka logosu yukleme hatasinda R yedegine doner ve URL degisimini sifirlar", () => {
  assert.match(logo, /onError=\{\(\) => setGorselHatali\(true\)\}/);
  assert.match(logo, /useEffect\(\(\) => \{[\s\S]*setGorselHatali\(false\)/);
  assert.match(logo, /♛/);
  assert.match(logo, />\s*R\s*</);
});

test("anasayfa hero'su ortak logo renderer'ini kullanir", () => {
  assert.match(anaSayfa, /import \{ MarkaLogosuIcerigi \} from "@\/components\/menu\/MarkaLogosu"/);
  assert.match(anaSayfa, /<MarkaLogosuIcerigi[\s\S]*logoUrl=\{logo\}/);
  assert.doesNotMatch(anaSayfa, /<Image[\s\S]*src=\{logo\}/);
});
