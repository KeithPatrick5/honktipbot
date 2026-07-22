import { loadConfig, loadTokenRegistry } from "./config.js";
import { loadWalletMnemonic } from "./wallet-secret.js";
import { MainnetCashAdapter } from "./adapters/mainnet-cash-adapter.js";
import { TippingService } from "./core/tipping-service.js";
import { SqliteLedger } from "./storage/sqlite-ledger.js";
import { createBot, notifyWithdrawal } from "./bot/create-bot.js";

export async function createApplication({ env = process.env, cwd = process.cwd() } = {}) {
  const config = loadConfig(env, cwd);
  const registry = loadTokenRegistry(config.registryPath);
  const ledger = new SqliteLedger(config.databasePath);
  try {
    const mnemonic = loadWalletMnemonic(config);
    const blockchain = await MainnetCashAdapter.create({ config, ledger, registry, mnemonic });
    const service = new TippingService({ ledger, registry });
    const bot = createBot({ token: config.botToken, service, registry, blockchain });
    return { config, registry, ledger, blockchain, service, bot };
  } catch (error) {
    ledger.close();
    throw error;
  }
}

export async function poll(app) {
  await app.blockchain.scanDeposits();
  await app.blockchain.processWithdrawals(item => notifyWithdrawal(app.bot, item, app.registry));
  await app.blockchain.updateWithdrawalConfirmations(item => notifyWithdrawal(app.bot, item, app.registry));
}
