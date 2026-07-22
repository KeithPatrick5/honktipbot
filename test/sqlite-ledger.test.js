import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SqliteLedger } from "../src/storage/sqlite-ledger.js";

test("SQLite ledger commits both sides and journal in one transaction", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "honktipbot-"));
  const ledger = new SqliteLedger(path.join(directory, "test.sqlite"));
  t.after(() => { ledger.close(); fs.rmSync(directory, { recursive: true }); });
  ledger.upsertUser({ id: 1, first_name: "Alice" });
  ledger.upsertUser({ id: 2, first_name: "Bob" });
  const category = "0".repeat(64);
  ledger.setBalance("1", category, 5n);
  ledger.transfer({ fromUserId: "1", toUserId: "2", category, units: 2n, kind: "test" });
  assert.equal(ledger.getBalance("1", category), 3n);
  assert.equal(ledger.getBalance("2", category), 2n);
  assert.equal(ledger.db.prepare("SELECT count(*) AS count FROM ledger_entries").get().count, 1);
});

test("withdrawal reservation is atomic and refund is idempotent", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "honktipbot-"));
  const ledger = new SqliteLedger(path.join(directory, "test.sqlite"));
  t.after(() => { ledger.close(); fs.rmSync(directory, { recursive: true }); });
  const category = "1".repeat(64);
  ledger.upsertUser({ id: 1, first_name: "Alice" });
  ledger.setBalance("1", category, 9n);
  const item = ledger.reserveWithdrawal({ userId: "1", category, units: 4n, destination: "bchtest:ztest" });
  assert.equal(ledger.getBalance("1", category), 5n);
  assert.equal(item.status, "reserved");
  assert.equal(ledger.refundWithdrawal(item.id, "construction failed"), true);
  assert.equal(ledger.refundWithdrawal(item.id, "again"), false);
  assert.equal(ledger.getBalance("1", category), 9n);
});
