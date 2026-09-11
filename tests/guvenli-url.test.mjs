import test from "node:test";
import assert from "node:assert/strict";

import {
  httpsUrlDogrula,
  nextGorselUrlDogrula,
  whatsappUrlDogrula,
} from "../src/lib/guvenli-url.ts";
import { gorselDepoYolu } from "../src/lib/gorsel-depo-yolu.ts";

test("genel dış bağlantı yalnız HTTPS ve kimlik bilgisi olmadan kabul edilir", () => {
  assert.equal(
    httpsUrlDogrula(" https://maps.app.goo.gl/AbCd123 "),
    "https://maps.app.goo.gl/AbCd123",
  );
  assert.equal(httpsUrlDogrula("http://maps.google.com/example"), null);
  assert.equal(httpsUrlDogrula("javascript:alert(1)"), null);
  assert.equal(httpsUrlDogrula("https://user:pass@maps.google.com/example"), null);
  assert.equal(httpsUrlDogrula(""), null);
});

test("Next Image yalnız yapılandırılmış uzak görsel sunucularını kabul eder", () => {
  assert.equal(
    nextGorselUrlDogrula("https://ornek.supabase.co/storage/v1/object/public/menu-gorseller/ayarlar/logo.png"),
    "https://ornek.supabase.co/storage/v1/object/public/menu-gorseller/ayarlar/logo.png",
  );
  assert.equal(nextGorselUrlDogrula("https://images.unsplash.com/photo-1"), "https://images.unsplash.com/photo-1");
  assert.equal(nextGorselUrlDogrula("https://example.com/logo.png"), null);
  assert.equal(nextGorselUrlDogrula("https://supabase.co.evil.test/logo.png"), null);
});

test("Storage silme yolu yalnız aynı Supabase projesinden çıkarılır", () => {
  const proje = "https://royal-test.supabase.co";
  assert.equal(
    gorselDepoYolu(
      `${proje}/storage/v1/object/public/menu-gorseller/ayarlar/telefon-logo.png`,
      "ayarlar",
      proje,
    ),
    "ayarlar/telefon-logo.png",
  );
  assert.equal(
    gorselDepoYolu(
      "https://baska.supabase.co/storage/v1/object/public/menu-gorseller/ayarlar/telefon-logo.png",
      "ayarlar",
      proje,
    ),
    null,
  );
  assert.equal(
    gorselDepoYolu(
      `${proje}/storage/v1/object/public/menu-gorseller/urunler/../../ayarlar/logo.png`,
      "ayarlar",
      proje,
    ),
    null,
  );
});

test("WhatsApp tekrar bağlantısı yalnız dar wa.me biçimini kabul eder", () => {
  assert.equal(
    whatsappUrlDogrula("https://wa.me/905434888828?text=Sipari%C5%9F%20R-123"),
    "https://wa.me/905434888828?text=Sipari%C5%9F%20R-123",
  );
  assert.equal(whatsappUrlDogrula("http://wa.me/905434888828"), null);
  assert.equal(whatsappUrlDogrula("https://wa.me.evil.test/905434888828"), null);
  assert.equal(whatsappUrlDogrula("https://www.wa.me/905434888828"), null);
  assert.equal(whatsappUrlDogrula("https://user@wa.me/905434888828"), null);
  assert.equal(whatsappUrlDogrula("https://wa.me/not-a-number"), null);
  assert.equal(whatsappUrlDogrula("https://wa.me/905434888828?app_absent=0"), null);
  assert.equal(whatsappUrlDogrula("https://wa.me/905434888828#example"), null);
});
