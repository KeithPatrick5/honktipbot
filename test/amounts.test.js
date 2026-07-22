import test from "node:test";
import assert from "node:assert/strict";
import { formatAmount, parseAmount } from "../src/core/amounts.js";

test("amounts round-trip integer base units", () => {
  assert.equal(parseAmount("1,234.50", 2), 123450n);
  assert.equal(formatAmount(123450n, 2), "1234.5");
  assert.equal(formatAmount(10n, 0), "10");
});

test("amount parser rejects unsafe values", () => {
  for (const value of ["0", "-1", "1e3", "Infinity", "one"]) {
    assert.throws(() => parseAmount(value, 2));
  }
  assert.throws(() => parseAmount("1.001", 2), /at most 2/);
});
