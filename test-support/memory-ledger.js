export class MemoryLedger {
  constructor() { this.users = new Map(); this.balances = new Map(); this.entries = []; }
  key(userId, category) { return `${userId}:${category}`; }
  upsertUser(profile) { this.users.set(String(profile.id), { ...profile, id: String(profile.id) }); }
  getBalance(userId, category) { return this.balances.get(this.key(userId, category)) || 0n; }
  credit({ userId, category, units, kind = "test_credit" }) {
    const amount = BigInt(units);
    if (amount <= 0n) throw new Error("Credit must be positive.");
    this.balances.set(this.key(userId, category), this.getBalance(userId, category) + amount);
    this.entries.push({ userId: String(userId), category, delta: amount, kind });
  }
  transfer({ fromUserId, toUserId, category, units, kind }) {
    const amount = BigInt(units);
    if (amount <= 0n) throw new Error("Tip must be positive.");
    const available = this.getBalance(fromUserId, category);
    if (available < amount) throw new Error("Insufficient balance.");
    this.balances.set(this.key(fromUserId, category), available - amount);
    this.balances.set(this.key(toUserId, category), this.getBalance(toUserId, category) + amount);
    this.entries.push({ fromUserId: String(fromUserId), toUserId: String(toUserId), category, units: amount, kind });
    return { fromBalance: available - amount, toBalance: this.getBalance(toUserId, category) };
  }
}
