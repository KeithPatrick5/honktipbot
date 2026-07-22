import test from "node:test";
import assert from "node:assert/strict";
import { MemoryLedger } from "../test-support/memory-ledger.js";
import { TippingService } from "../src/core/tipping-service.js";

const token = Object.freeze({ symbol: "DEMO", category: "0".repeat(64), decimals: 0, minimumTip: 1n, minimumWithdrawal: 1n });
const registry = { tokens: [token] };

test("tip moves one asset atomically between users", () => {
  const ledger = new MemoryLedger();
  const service = new TippingService({ ledger, registry });
  const from = { id: 1, first_name: "Alice" };
  const to = { id: 2, first_name: "Bob" };
  service.registerUser(from);
  service.registerUser(to);
  ledger.credit({ userId: "1", category: token.category, units: 10n });

  service.tip({ from, to, token, units: 3n });

  assert.equal(ledger.getBalance("1", token.category), 7n);
  assert.equal(ledger.getBalance("2", token.category), 3n);
  assert.equal(ledger.entries.at(-1).kind, "telegram_tip");
});

test("failed tip leaves both balances unchanged", () => {
  const ledger = new MemoryLedger();
  const service = new TippingService({ ledger, registry });
  const from = { id: 1, first_name: "Alice" };
  const to = { id: 2, first_name: "Bob" };
  service.registerUser(from);
  service.registerUser(to);
  ledger.credit({ userId: "1", category: token.category, units: 2n });

  assert.throws(() => service.tip({ from, to, token, units: 3n }), /Insufficient/);
  assert.equal(ledger.getBalance("1", token.category), 2n);
  assert.equal(ledger.getBalance("2", token.category), 0n);
});

test("self tips and tips to bots are rejected", () => {
  const ledger = new MemoryLedger();
  const service = new TippingService({ ledger, registry });
  const user = { id: 1, first_name: "Alice" };
  assert.throws(() => service.tip({ from: user, to: user, token, units: 1n }), /yourself/);
  assert.throws(() => service.tip({ from: user, to: { id: 2, is_bot: true }, token, units: 1n }), /Bots/);
});
