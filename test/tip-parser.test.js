import test from "node:test";
import assert from "node:assert/strict";
import { TokenRegistry } from "../src/config.js";
import { parseTip } from "../src/core/tip-parser.js";

const token = Object.freeze({ symbol: "DEMO", category: "0".repeat(64), decimals: 2, enabled: true, emoji: "🎪" });
const registry = new TokenRegistry([token]);

test("parses configured symbol tips", () => {
  const tip = parseTip("please take 1,250.25 demo", registry);
  assert.equal(tip.amount, "1,250.25");
  assert.equal(tip.token, token);
});

test("parses configured emoji tips and ignores unapproved symbols", () => {
  assert.equal(parseTip("🎪🎪", registry).amount, "2");
  assert.equal(parseTip("10 HONK", registry), null);
});
