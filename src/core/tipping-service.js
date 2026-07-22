import { formatAmount } from "./amounts.js";

export class TippingService {
  constructor({ ledger, registry }) {
    this.ledger = ledger;
    this.registry = registry;
  }

  registerUser(profile) {
    this.ledger.upsertUser(profile);
  }

  balances(userId) {
    return this.registry.tokens.map(token => ({ token, units: this.ledger.getBalance(userId, token.category) }));
  }

  tip({ from, to, token, units }) {
    if (String(from.id) === String(to.id)) throw new Error("You cannot tip yourself.");
    if (to.is_bot) throw new Error("Bots cannot receive tips.");
    if (BigInt(units) < token.minimumTip) throw new Error(`Minimum tip is ${formatAmount(token.minimumTip, token.decimals)} ${token.symbol}.`);
    this.registerUser(from);
    this.registerUser(to);
    return this.ledger.transfer({
      fromUserId: String(from.id),
      toUserId: String(to.id),
      category: token.category,
      units,
      kind: "telegram_tip"
    });
  }

  reserveWithdrawal({ user, token, units, destination }) {
    this.registerUser(user);
    if (BigInt(units) < token.minimumWithdrawal) throw new Error(`Minimum withdrawal is ${formatAmount(token.minimumWithdrawal, token.decimals)} ${token.symbol}.`);
    return this.ledger.reserveWithdrawal({ userId: String(user.id), category: token.category, units, destination });
  }
}
