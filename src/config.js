import fs from "node:fs";
import path from "node:path";
import { parseAmount } from "./core/amounts.js";

const isCategory = value => /^[0-9a-f]{64}$/i.test(value);
const isSymbol = value => /^[A-Z][A-Z0-9]{1,11}$/.test(value);

export function loadConfig(env = process.env, cwd = process.cwd()) {
  const required = name => {
    if (!env[name]) throw new Error(`${name} is required.`);
    return env[name];
  };
  const positiveInteger = (name, fallback) => {
    const value = Number(env[name] || fallback);
    if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
    return value;
  };
  const network = env.NETWORK || "chipnet";
  if (!["mainnet", "chipnet"].includes(network)) throw new Error("NETWORK must be mainnet or chipnet.");
  const walletSecretFile = env.WALLET_SECRET_FILE ? path.resolve(cwd, env.WALLET_SECRET_FILE) : null;
  if (!env.WALLET_MNEMONIC && !walletSecretFile) throw new Error("WALLET_MNEMONIC or WALLET_SECRET_FILE is required.");

  const electrumUrl = required("ELECTRUM_URL");
  if (!/^wss?:\/\//.test(electrumUrl)) throw new Error("ELECTRUM_URL must use ws:// or wss://.");
  const parsedElectrumUrl = new URL(electrumUrl);
  if (parsedElectrumUrl.username || parsedElectrumUrl.password) throw new Error("ELECTRUM_URL must not contain credentials.");
  const adminTelegramIds = (env.ADMIN_TELEGRAM_IDS || "").split(",").map(value => value.trim()).filter(Boolean);
  if (adminTelegramIds.some(id => !/^\d+$/.test(id))) throw new Error("ADMIN_TELEGRAM_IDS must be comma-separated numeric IDs.");
  return Object.freeze({
    botToken: required("BOT_TOKEN"),
    network,
    electrumUrl,
    walletMnemonic: env.WALLET_MNEMONIC || null,
    walletSecretFile,
    depositConfirmations: positiveInteger("DEPOSIT_CONFIRMATIONS", 2),
    pollIntervalMs: positiveInteger("POLL_INTERVAL_MS", 30000),
    adminTelegramIds: Object.freeze(adminTelegramIds),
    databasePath: path.resolve(cwd, env.DATABASE_PATH || "data/honktipbot.sqlite"),
    registryPath: path.resolve(cwd, env.TOKEN_REGISTRY_PATH || "config/tokens.example.json")
  });
}

export function loadTokenRegistry(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!parsed || !Array.isArray(parsed.tokens) || parsed.tokens.length === 0) {
    throw new Error("Token registry must contain a non-empty tokens array.");
  }
  const symbols = new Set();
  const categories = new Set();
  const emojis = new Set();
  const tokens = parsed.tokens.map(raw => {
    const symbol = String(raw.symbol || "").toUpperCase();
    const category = String(raw.category || "").toLowerCase();
    const decimals = Number(raw.decimals);
    if (!isSymbol(symbol)) throw new Error(`Invalid token symbol: ${raw.symbol}`);
    if (!isCategory(category)) throw new Error(`Invalid CashToken category for ${symbol}`);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 9) throw new Error(`Invalid decimals for ${symbol}`);
    if (symbols.has(symbol) || categories.has(category)) throw new Error(`Duplicate token: ${symbol}`);
    if (raw.emoji && emojis.has(raw.emoji)) throw new Error(`Duplicate token emoji: ${raw.emoji}`);
    symbols.add(symbol);
    categories.add(category);
    if (raw.emoji) emojis.add(raw.emoji);
    const token = {
      symbol,
      name: String(raw.name || symbol),
      category,
      decimals,
      enabled: raw.enabled === true,
      emoji: raw.emoji ? String(raw.emoji) : null,
      minimumTip: parseAmount(raw.minimumTip, decimals),
      minimumDeposit: parseAmount(raw.minimumDeposit, decimals),
      minimumWithdrawal: parseAmount(raw.minimumWithdrawal, decimals)
    };
    return Object.freeze(token);
  });
  return new TokenRegistry(tokens);
}

export class TokenRegistry {
  constructor(tokens) {
    this.tokens = Object.freeze(tokens.filter(token => token.enabled));
    if (this.tokens.length === 0) throw new Error("At least one token must be enabled.");
    this.bySymbol = new Map(this.tokens.map(token => [token.symbol, token]));
    this.byCategory = new Map(this.tokens.map(token => [token.category, token]));
    this.byEmoji = new Map(this.tokens.filter(token => token.emoji).map(token => [token.emoji, token]));
  }
  get(symbol) { return this.bySymbol.get(String(symbol).toUpperCase()) || null; }
  require(symbol) {
    const token = this.get(symbol);
    if (!token) throw new Error(`Unsupported token: ${symbol}`);
    return token;
  }
}
