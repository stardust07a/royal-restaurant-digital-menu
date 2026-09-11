import test from "node:test";
import assert from "node:assert/strict";

import { acikMi } from "../src/lib/calisma-saatleri.ts";

const temel = {
  siparis_alimi_acik: true,
  calisma_saatleri: null,
};

/** 2026-08-17 Pazartesi; İstanbul UTC+3. */
const istanbul = (saat, dakika = 0) =>
  new Date(Date.UTC(2026, 7, 17, saat - 3, dakika));

test("genel sipariş anahtarı ve tanımsız program davranışı nettir", () => {
  assert.equal(acikMi(temel, istanbul(12)), true);
  assert.equal(acikMi({ ...temel, siparis_alimi_acik: false }, istanbul(12)), false);
});

test("aynı gün çalışma aralığı açılış dahil, kapanış hariçtir", () => {
  const ayarlar = {
    ...temel,
    calisma_saatleri: {
      pazartesi: { acilis: "11:00", kapanis: "22:00", kapali: false },
    },
  };

  assert.equal(acikMi(ayarlar, istanbul(10, 59)), false);
  assert.equal(acikMi(ayarlar, istanbul(11)), true);
  assert.equal(acikMi(ayarlar, istanbul(21, 59)), true);
  assert.equal(acikMi(ayarlar, istanbul(22)), false);
});

test("gece yarısını aşan mesai ertesi güne taşar", () => {
  const ayarlar = {
    ...temel,
    calisma_saatleri: {
      pazartesi: { acilis: "11:00", kapanis: "02:00", kapali: false },
    },
  };
  const sali0130 = new Date(Date.UTC(2026, 7, 17, 22, 30));
  const sali0200 = new Date(Date.UTC(2026, 7, 17, 23, 0));

  assert.equal(acikMi(ayarlar, sali0130), true);
  assert.equal(acikMi(ayarlar, sali0200), false);
});

test("kapalı günler ve bozuk HH:mm değerleri sipariş açmaz", () => {
  assert.equal(
    acikMi(
      {
        ...temel,
        calisma_saatleri: {
          pazartesi: { acilis: "00:00", kapanis: "23:59", kapali: true },
        },
      },
      istanbul(12),
    ),
    false,
  );
  assert.equal(
    acikMi(
      {
        ...temel,
        calisma_saatleri: {
          pazartesi: { acilis: "11:60", kapanis: "22:00", kapali: false },
        },
      },
      istanbul(12),
    ),
    false,
  );
});
