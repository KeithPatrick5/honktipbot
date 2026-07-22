import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadConfig, loadTokenRegistry } from "../src/config.js";

const root = path.resolve(import.meta.dirname, "..");
const validEnv = {
  BOT_TOKEN: "test-token",
  NETWORK: "chipnet",
  ELECTRUM_URL: "wss://example.invalid:50004",
  WALLET_MNEMONIC: "one two three four five six seven eight nine ten eleven twelve"
};

test("configuration validates network and required live settings", () => {
  const config = loadConfig(validEnv, root);
  assert.equal(config.network, "chipnet");
  assert.equal(config.depositConfirmations, 2);
  assert.throws(() => loadConfig({}, root), /WALLET|BOT_TOKEN/);
  assert.throws(() => loadConfig({ ...validEnv, NETWORK: "testnet" }, root), /mainnet or chipnet/);
});

test("token registry loads amount minimums in base units", () => {
  const registry = loadTokenRegistry(path.join(root, "config/tokens.example.json"));
  assert.equal(registry.get("demo").minimumTip, 1n);
  assert.equal(registry.get("demo").minimumDeposit, 1n);
  assert.equal(registry.get("demo").minimumWithdrawal, 1n);
  assert.equal(registry.get("HONK"), null);
});
