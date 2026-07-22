import {
  HDWallet,
  TestNetHDWallet,
  TokenSendRequest,
  getNetworkProvider,
  DefaultProvider
} from "mainnet-js";
import { binToHex, decodeCashAddress, hashTransaction, hexToBin } from "@bitauth/libauth";

export class MainnetCashAdapter {
  constructor({ config, ledger, registry, wallet, provider }) {
    this.config = config;
    this.ledger = ledger;
    this.registry = registry;
    this.wallet = wallet;
    this.provider = provider;
    this.processingWithdrawals = false;
  }

  static async create({ config, ledger, registry, mnemonic }) {
    const network = config.network === "mainnet" ? "mainnet" : "testnet";
    DefaultProvider.servers[network] = [config.electrumUrl];
    const provider = getNetworkProvider(network);
    await provider.connect();
    const WalletClass = config.network === "mainnet" ? HDWallet : TestNetHDWallet;
    const scanThrough = Math.max(0, ledger.maxDepositIndex() + 1);
    const wallet = await WalletClass.fromSeed(mnemonic, undefined, scanThrough, 0);
    return new MainnetCashAdapter({ config, ledger, registry, wallet, provider });
  }

  capabilities() { return Object.freeze({ deposits: true, withdrawals: true, broadcasting: true, custody: true }); }
  async depositAddress(profile) {
    const address = this.ledger.getOrAssignDeposit(profile, index => this.wallet.getTokenDepositAddress(index));
    if (this.ledger.maxDepositIndex() + 1 >= this.wallet.depositStatuses.length) await this.wallet.scanMoreAddresses();
    return address;
  }
  feeAddress() { return this.wallet.getDepositAddress(0); }
  async feeBalance() { return this.wallet.getBalance(); }

  validateTokenAddress(address) {
    const decoded = decodeCashAddress(address);
    if (typeof decoded === "string") throw new Error(decoded);
    const expectedPrefix = this.config.network === "mainnet" ? "bitcoincash" : "bchtest";
    if (decoded.prefix !== expectedPrefix) throw new Error(`Address must be for ${this.config.network}.`);
    if (!decoded.type.endsWith("WithTokens")) throw new Error("Use a token-aware CashTokens address.");
    return address;
  }

  async scanDeposits() {
    const tipHeight = await this.provider.getBlockHeight();
    const seen = new Set();
    for (const user of this.ledger.listDepositUsers()) {
      const utxos = await this.provider.getUtxos(user.deposit_address);
      for (const utxo of utxos) {
        if (!utxo.token || !this.registry.byCategory.has(utxo.token.category)) continue;
        const token = this.registry.byCategory.get(utxo.token.category);
        const confirmations = utxo.height && utxo.height > 0 ? Math.max(0, tipHeight - utxo.height + 1) : 0;
        const key = `${utxo.txid}:${utxo.vout}:${utxo.token.category}`;
        seen.add(key);
        this.ledger.observeDeposit({
          txid: utxo.txid,
          outputIndex: utxo.vout,
          category: utxo.token.category,
          userId: user.id,
          units: utxo.token.amount,
          blockHeight: utxo.height,
          confirmations,
          minimum: token.minimumDeposit
        });
      }
    }
    this.ledger.markMissingPending(seen);
    return this.ledger.creditConfirmedDeposits(this.config.depositConfirmations);
  }

  async processWithdrawals(onUpdate = async () => {}) {
    if (this.processingWithdrawals) return;
    this.processingWithdrawals = true;
    try {
    for (const item of this.ledger.listProcessableWithdrawals()) {
      let withdrawal = item;
      if (withdrawal.status === "reserved") {
        try {
          const request = new TokenSendRequest({
            cashaddr: withdrawal.destination,
            category: withdrawal.token_category,
            amount: BigInt(withdrawal.units),
            value: 1000n
          });
          const { encodedTransaction } = await this.wallet.encodeTransaction([request]);
          const raw = binToHex(encodedTransaction);
          const txid = hashTransaction(encodedTransaction);
          this.ledger.markWithdrawalSigned(withdrawal.id, raw, txid);
          withdrawal = this.ledger.getWithdrawal(withdrawal.id);
        } catch (error) {
          this.ledger.refundWithdrawal(withdrawal.id, `Construction failed: ${error.message}`);
          await onUpdate(this.ledger.getWithdrawal(withdrawal.id));
          continue;
        }
      }
      try {
        const returnedTxid = await this.wallet.submitTransaction(hexToBin(withdrawal.raw_transaction), true);
        this.ledger.markWithdrawalBroadcast(withdrawal.id, returnedTxid || withdrawal.txid);
        await onUpdate(this.ledger.getWithdrawal(withdrawal.id));
      } catch (error) {
        try {
          await this.provider.getRawTransaction(withdrawal.txid);
          this.ledger.markWithdrawalBroadcast(withdrawal.id, withdrawal.txid);
          await onUpdate(this.ledger.getWithdrawal(withdrawal.id));
        } catch {
          // Broadcast errors are ambiguous: keep identical signed bytes for retry.
          this.ledger.noteWithdrawalError(withdrawal.id, `Broadcast pending retry: ${error.message}`);
        }
      }
    }
    } finally { this.processingWithdrawals = false; }
  }

  async updateWithdrawalConfirmations(onUpdate = async () => {}) {
    const height = await this.provider.getBlockHeight();
    for (const item of this.ledger.listBroadcastWithdrawals()) {
      const history = await this.provider.getHistory(item.destination);
      const match = history.find(entry => entry.tx_hash === item.txid);
      const confirmations = match?.height > 0 ? Math.max(0, height - match.height + 1) : 0;
      if (confirmations >= this.config.depositConfirmations) {
        this.ledger.markWithdrawalCompleted(item.id, confirmations);
        await onUpdate(this.ledger.getWithdrawal(item.id));
      }
    }
  }

  async stop() {
    await this.wallet.stop();
    await this.provider.disconnect();
  }
}
