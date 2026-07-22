import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MainnetCashAdapter } from "../src/adapters/mainnet-cash-adapter.js";
import { SqliteLedger } from "../src/storage/sqlite-ledger.js";
import { encodeCashAddress } from "@bitauth/libauth";

const category = "2".repeat(64);
const token = { category, symbol: "TEST", decimals: 0, minimumDeposit: 2n };
const registry = { byCategory: new Map([[category, token]]) };
const config = { network: "chipnet", depositConfirmations: 2 };

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "honktipbot-flow-"));
  const ledger = new SqliteLedger(path.join(directory, "test.sqlite"));
  t.after(() => { ledger.close(); fs.rmSync(directory, { recursive: true }); });
  ledger.upsertUser({ id: 1, first_name: "Alice" });
  ledger.getOrAssignDeposit({ id: 1, first_name: "Alice" }, () => "bchtest:zdeposit");
  return { ledger };
}

test("withdrawal address validation requires the configured network and token-aware type", () => {
  const adapter = new MainnetCashAdapter({ config, ledger: {}, registry, wallet: {}, provider: {} });
  const tokenAddress = encodeCashAddress({ payload: new Uint8Array(20), prefix: "bchtest", type: "p2pkhWithTokens" }).address;
  const plainAddress = encodeCashAddress({ payload: new Uint8Array(20), prefix: "bchtest", type: "p2pkh" }).address;
  assert.equal(adapter.validateTokenAddress(tokenAddress), tokenAddress);
  assert.throws(() => adapter.validateTokenAddress(plainAddress), /token-aware/);
});

test("deposit credits once only after required confirmations", async t => {
  const { ledger } = fixture(t);
  let height = 100;
  const provider = {
    getBlockHeight: async () => height,
    getUtxos: async () => [{ txid: "a".repeat(64), vout: 1, height: 100, address: "bchtest:zdeposit", satoshis: 1000n, token: { category, amount: 5n } }]
  };
  const adapter = new MainnetCashAdapter({ config, ledger, registry, wallet: {}, provider });
  await adapter.scanDeposits();
  assert.equal(ledger.getBalance("1", category), 0n);
  height = 101;
  await adapter.scanDeposits();
  assert.equal(ledger.getBalance("1", category), 5n);
  assert.equal(ledger.db.prepare("SELECT count(*) AS count FROM deposits").get().count, 1);
  assert.equal(ledger.db.prepare("SELECT count(*) AS count FROM ledger_entries WHERE kind='deposit'").get().count, 1);
});

test("construction failure refunds, while broadcast retry reuses signed transaction", async t => {
  const { ledger } = fixture(t);
  ledger.setBalance("1", category, 10n);
  const failed = ledger.reserveWithdrawal({ userId: "1", category, units: 3n, destination: "bchtest:zbad" });
  const constructionAdapter = new MainnetCashAdapter({ config, ledger, registry, provider: {}, wallet: { encodeTransaction: async () => { throw new Error("no fee BCH"); } } });
  await constructionAdapter.processWithdrawals();
  assert.equal(ledger.getWithdrawal(failed.id).status, "failed");
  assert.equal(ledger.getBalance("1", category), 10n);

  const retry = ledger.reserveWithdrawal({ userId: "1", category, units: 2n, destination: "bchtest:zretry" });
  ledger.markWithdrawalSigned(retry.id, "00", "b".repeat(64));
  let calls = 0;
  const retryAdapter = new MainnetCashAdapter({ config, ledger, registry, provider: {}, wallet: { submitTransaction: async () => { calls += 1; if (calls === 1) throw new Error("timeout"); return "b".repeat(64); } } });
  await retryAdapter.processWithdrawals();
  assert.equal(ledger.getWithdrawal(retry.id).status, "signed");
  await retryAdapter.processWithdrawals();
  assert.equal(ledger.getWithdrawal(retry.id).status, "broadcast");
  assert.equal(calls, 2);
});
