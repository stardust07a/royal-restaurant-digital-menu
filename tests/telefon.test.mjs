import test from "node:test";
import assert from "node:assert/strict";

import { telefonGecerliMi, telefonNormalize } from "../src/lib/telefon.ts";

test("telefonNormalize yalnız rakamları bırakır", () => {
  assert.equal(telefonNormalize("+90 (543) 488-88-28"), "905434888828");
  assert.equal(telefonNormalize(" 05.43 abc 488 88 28 "), "05434888828");
});

test("telefonGecerliMi E.164 uzunluk sınırlarını uygular", () => {
  assert.equal(telefonGecerliMi("+90 543 488 88 28"), true);
  assert.equal(telefonGecerliMi("1234567890"), true);
  assert.equal(telefonGecerliMi("123456789012345"), true);
  assert.equal(telefonGecerliMi("123456789"), false);
  assert.equal(telefonGecerliMi("1234567890123456"), false);
  assert.equal(telefonGecerliMi("telefon yok"), false);
  assert.equal(telefonGecerliMi("905434888828\nTOPLAM: 1"), false);
  assert.equal(telefonGecerliMi("905434888828\u202e"), true);
});
