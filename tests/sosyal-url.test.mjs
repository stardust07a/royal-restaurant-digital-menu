import test from "node:test";
import assert from "node:assert/strict";

import { sosyalGosterim, sosyalUrlDogrula } from "../src/lib/sosyal-url.ts";

test("sosyalUrlDogrula yalnız HTTPS ve beklenen platform alanını kabul eder", () => {
  assert.equal(
    sosyalUrlDogrula(" https://www.instagram.com/royalrestaurant.tr ", "instagram"),
    "https://www.instagram.com/royalrestaurant.tr",
  );
  assert.equal(
    sosyalUrlDogrula("https://m.facebook.com/royal.restaurant", "facebook"),
    "https://m.facebook.com/royal.restaurant",
  );
  assert.equal(sosyalUrlDogrula("https://vm.tiktok.com/example", "tiktok"), "https://vm.tiktok.com/example");

  assert.equal(sosyalUrlDogrula("http://instagram.com/royal", "instagram"), null);
  assert.equal(sosyalUrlDogrula("https://instagram.com.evil.test/royal", "instagram"), null);
  assert.equal(sosyalUrlDogrula("https://user:pass@instagram.com/royal", "instagram"), null);
  assert.equal(sosyalUrlDogrula("https://instagram.com/royal", "tiktok"), null);
  assert.equal(sosyalUrlDogrula("", "facebook"), null);
});

test("sosyalGosterim güvenli profil etiketini veya platform yedeğini döndürür", () => {
  assert.equal(sosyalGosterim("https://instagram.com/@royal.restaurant", "Instagram"), "@royal.restaurant");
  assert.equal(sosyalGosterim("https://facebook.com/profile.php?id=1", "Facebook"), "Facebook");
  assert.equal(sosyalGosterim("https://example.com/%E0%A4%A", "Sosyal medya"), "Sosyal medya");
});
