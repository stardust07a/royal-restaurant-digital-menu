import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  guvenlikBasliklariniOlustur,
  icerikGuvenlikPolitikasi,
} from "../src/lib/guvenlik-basliklari.ts";

const KOK = dirname(dirname(fileURLToPath(import.meta.url)));
const config = readFileSync(join(KOK, "next.config.ts"), "utf8");

test("Next üretim yapılandırması temel güvenlik başlıklarını içerir", () => {
  assert.match(config, /poweredByHeader:\s*false/);
  assert.match(config, /guvenlikBasliklariniOlustur\(production\)/);

  const basliklar = new Map(
    guvenlikBasliklariniOlustur(true).map(({ key, value }) => [key, value]),
  );
  assert.ok(basliklar.has("Content-Security-Policy"));
  assert.equal(basliklar.get("X-Frame-Options"), "DENY");
  assert.equal(basliklar.get("X-Content-Type-Options"), "nosniff");
  assert.equal(basliklar.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(
    basliklar.get("Strict-Transport-Security"),
    "max-age=63072000; includeSubDomains; preload",
  );
});

test("CSP uygulamanın gerekli dış kaynaklarını dar kapsamla tanımlar", () => {
  const productionCsp = icerikGuvenlikPolitikasi(true);
  const gelistirmeCsp = icerikGuvenlikPolitikasi(false);

  assert.match(productionCsp, /connect-src 'self' https:\/\/\*\.supabase\.co wss:\/\/\*\.supabase\.co/);
  assert.match(productionCsp, /frame-src https:\/\/www\.google\.com https:\/\/maps\.google\.com/);
  assert.match(productionCsp, /img-src 'self' data: blob: https:\/\/\*\.supabase\.co/);
  assert.match(productionCsp, /script-src 'self' 'unsafe-inline'/);
  assert.doesNotMatch(productionCsp, /'unsafe-eval'/);
  assert.match(gelistirmeCsp, /'unsafe-eval'/);
  assert.match(productionCsp, /object-src 'none'/);
  assert.match(productionCsp, /base-uri 'self'/);
  assert.match(productionCsp, /form-action 'self'/);
  assert.match(productionCsp, /frame-ancestors 'none'/);
});
