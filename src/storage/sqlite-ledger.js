import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

export class SqliteLedger {
  constructor(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
    this.migrate();
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, first_name TEXT NOT NULL, username TEXT, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS balances (user_id TEXT NOT NULL REFERENCES users(id), token_category TEXT NOT NULL, units TEXT NOT NULL, PRIMARY KEY(user_id, token_category));
      CREATE TABLE IF NOT EXISTS ledger_entries (id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, kind TEXT NOT NULL, from_user_id TEXT, to_user_id TEXT, token_category TEXT NOT NULL, units TEXT NOT NULL, metadata TEXT);
      CREATE TABLE IF NOT EXISTS deposits (
        txid TEXT NOT NULL, output_index INTEGER NOT NULL, token_category TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
        units TEXT NOT NULL, block_height INTEGER, confirmations INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL, first_seen_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        PRIMARY KEY(txid, output_index, token_category)
      );
      CREATE TABLE IF NOT EXISTS withdrawals (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), token_category TEXT NOT NULL, units TEXT NOT NULL,
        destination TEXT NOT NULL, status TEXT NOT NULL, raw_transaction TEXT, txid TEXT, confirmations INTEGER NOT NULL DEFAULT 0,
        error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    this.ensureColumn("users", "deposit_index", "INTEGER");
    this.ensureColumn("users", "deposit_address", "TEXT");
    this.ensureColumn("ledger_entries", "reference", "TEXT");
    this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS ledger_reference_unique ON ledger_entries(reference) WHERE reference IS NOT NULL;");
  }

  ensureColumn(table, column, definition) {
    const exists = this.db.prepare(`PRAGMA table_info(${table})`).all().some(item => item.name === column);
    if (!exists) this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }

  transaction(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = fn(); this.db.exec("COMMIT"); return result; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }

  upsertUser(profile) {
    this.db.prepare(`INSERT INTO users(id, first_name, username, updated_at) VALUES(?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET first_name=excluded.first_name, username=excluded.username, updated_at=excluded.updated_at`)
      .run(String(profile.id), String(profile.first_name || "Telegram user"), profile.username || null, new Date().toISOString());
  }

  getOrAssignDeposit(profile, deriveAddress) {
    this.upsertUser(profile);
    return this.transaction(() => {
      let user = this.db.prepare("SELECT * FROM users WHERE id=?").get(String(profile.id));
      if (user.deposit_address) return user.deposit_address;
      const next = Number(this.db.prepare("SELECT value FROM settings WHERE key='next_deposit_index'").get()?.value || 0);
      const address = deriveAddress(next);
      this.db.prepare("UPDATE users SET deposit_index=?, deposit_address=? WHERE id=?").run(next, address, String(profile.id));
      this.db.prepare(`INSERT INTO settings(key,value) VALUES('next_deposit_index',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(String(next + 1));
      return address;
    });
  }

  listDepositUsers() { return this.db.prepare("SELECT id, deposit_index, deposit_address FROM users WHERE deposit_address IS NOT NULL").all(); }
  maxDepositIndex() { return Number(this.db.prepare("SELECT max(deposit_index) AS value FROM users").get()?.value ?? -1); }
  getBalance(userId, category) {
    const row = this.db.prepare("SELECT units FROM balances WHERE user_id=? AND token_category=?").get(String(userId), category);
    return row ? BigInt(row.units) : 0n;
  }
  setBalance(userId, category, units) {
    this.db.prepare(`INSERT INTO balances(user_id, token_category, units) VALUES(?,?,?) ON CONFLICT(user_id,token_category) DO UPDATE SET units=excluded.units`)
      .run(String(userId), category, BigInt(units).toString());
  }
  addLedger({ kind, fromUserId = null, toUserId = null, category, units, reference = null, metadata = null }) {
    this.db.prepare(`INSERT INTO ledger_entries(created_at,kind,from_user_id,to_user_id,token_category,units,reference,metadata) VALUES(?,?,?,?,?,?,?,?)`)
      .run(new Date().toISOString(), kind, fromUserId, toUserId, category, BigInt(units).toString(), reference, metadata ? JSON.stringify(metadata) : null);
  }

  transfer({ fromUserId, toUserId, category, units, kind }) {
    const amount = BigInt(units);
    if (amount <= 0n) throw new Error("Tip must be positive.");
    return this.transaction(() => {
      const from = this.getBalance(fromUserId, category);
      if (from < amount) throw new Error("Insufficient balance.");
      const to = this.getBalance(toUserId, category);
      this.setBalance(fromUserId, category, from - amount);
      this.setBalance(toUserId, category, to + amount);
      this.addLedger({ kind, fromUserId: String(fromUserId), toUserId: String(toUserId), category, units: amount });
      return { fromBalance: from - amount, toBalance: to + amount };
    });
  }

  observeDeposit({ txid, outputIndex, category, userId, units, blockHeight, confirmations, minimum }) {
    const now = new Date().toISOString();
    const existing = this.db.prepare("SELECT * FROM deposits WHERE txid=? AND output_index=? AND token_category=?").get(txid, outputIndex, category);
    if (!existing) {
      this.db.prepare(`INSERT INTO deposits(txid,output_index,token_category,user_id,units,block_height,confirmations,status,first_seen_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
        .run(txid, outputIndex, category, String(userId), BigInt(units).toString(), blockHeight || null, confirmations, BigInt(units) < minimum ? "below_minimum" : "pending", now, now);
    } else {
      this.db.prepare("UPDATE deposits SET block_height=?, confirmations=?, updated_at=?, status=CASE WHEN status='orphaned' THEN 'pending' ELSE status END WHERE txid=? AND output_index=? AND token_category=?")
        .run(blockHeight || null, confirmations, now, txid, outputIndex, category);
    }
  }

  creditConfirmedDeposits(requiredConfirmations) {
    const candidates = this.db.prepare("SELECT * FROM deposits WHERE status='pending' AND confirmations>=?").all(requiredConfirmations);
    for (const deposit of candidates) this.transaction(() => {
      const current = this.db.prepare("SELECT status FROM deposits WHERE txid=? AND output_index=? AND token_category=?").get(deposit.txid, deposit.output_index, deposit.token_category);
      if (current.status !== "pending") return;
      const amount = BigInt(deposit.units);
      this.setBalance(deposit.user_id, deposit.token_category, this.getBalance(deposit.user_id, deposit.token_category) + amount);
      this.addLedger({ kind: "deposit", toUserId: deposit.user_id, category: deposit.token_category, units: amount, reference: `deposit:${deposit.txid}:${deposit.output_index}:${deposit.token_category}` });
      this.db.prepare("UPDATE deposits SET status='credited', updated_at=? WHERE txid=? AND output_index=? AND token_category=?")
        .run(new Date().toISOString(), deposit.txid, deposit.output_index, deposit.token_category);
    });
    return candidates.length;
  }

  markMissingPending(seenKeys) {
    for (const deposit of this.db.prepare("SELECT * FROM deposits WHERE status='pending'").all()) {
      const key = `${deposit.txid}:${deposit.output_index}:${deposit.token_category}`;
      if (!seenKeys.has(key)) this.db.prepare("UPDATE deposits SET status='orphaned', updated_at=? WHERE txid=? AND output_index=? AND token_category=?")
        .run(new Date().toISOString(), deposit.txid, deposit.output_index, deposit.token_category);
    }
  }

  reserveWithdrawal({ userId, category, units, destination }) {
    const amount = BigInt(units);
    return this.transaction(() => {
      const balance = this.getBalance(userId, category);
      if (balance < amount) throw new Error("Insufficient balance.");
      const id = randomUUID();
      const now = new Date().toISOString();
      this.setBalance(userId, category, balance - amount);
      this.addLedger({ kind: "withdrawal_reserve", fromUserId: String(userId), category, units: amount, reference: `withdrawal:${id}:reserve` });
      this.db.prepare(`INSERT INTO withdrawals(id,user_id,token_category,units,destination,status,created_at,updated_at) VALUES(?,?,?,?,?,'reserved',?,?)`)
        .run(id, String(userId), category, amount.toString(), destination, now, now);
      return this.getWithdrawal(id);
    });
  }
  getWithdrawal(id) { return this.db.prepare("SELECT * FROM withdrawals WHERE id=?").get(id); }
  listProcessableWithdrawals() { return this.db.prepare("SELECT * FROM withdrawals WHERE status IN ('reserved','signed') ORDER BY created_at").all(); }
  listBroadcastWithdrawals() { return this.db.prepare("SELECT * FROM withdrawals WHERE status='broadcast' ORDER BY created_at").all(); }
  markWithdrawalSigned(id, rawTransaction, txid) { this.db.prepare("UPDATE withdrawals SET status='signed',raw_transaction=?,txid=?,updated_at=? WHERE id=? AND status='reserved'").run(rawTransaction, txid, new Date().toISOString(), id); }
  markWithdrawalBroadcast(id, txid) { this.db.prepare("UPDATE withdrawals SET status='broadcast',txid=?,error=NULL,updated_at=? WHERE id=? AND status IN ('signed','broadcast')").run(txid, new Date().toISOString(), id); }
  markWithdrawalCompleted(id, confirmations) { this.db.prepare("UPDATE withdrawals SET status='completed',confirmations=?,updated_at=? WHERE id=? AND status='broadcast'").run(confirmations, new Date().toISOString(), id); }
  noteWithdrawalError(id, error) { this.db.prepare("UPDATE withdrawals SET error=?,updated_at=? WHERE id=?").run(String(error).slice(0, 500), new Date().toISOString(), id); }
  refundWithdrawal(id, error) {
    return this.transaction(() => {
      const item = this.getWithdrawal(id);
      if (!item || !["reserved"].includes(item.status)) return false;
      const amount = BigInt(item.units);
      this.setBalance(item.user_id, item.token_category, this.getBalance(item.user_id, item.token_category) + amount);
      this.addLedger({ kind: "withdrawal_refund", toUserId: item.user_id, category: item.token_category, units: amount, reference: `withdrawal:${id}:refund` });
      this.db.prepare("UPDATE withdrawals SET status='failed',error=?,updated_at=? WHERE id=?").run(String(error).slice(0, 500), new Date().toISOString(), id);
      return true;
    });
  }
  close() { this.db.close(); }
}
