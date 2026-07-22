import { Telegraf } from "telegraf";
import { formatAmount, parseAmount } from "../core/amounts.js";
import { parseTip } from "../core/tip-parser.js";

export function parseCommandArgs(text) { return String(text).trim().split(/\s+/).slice(1); }

export function createBot({ token, service, registry, blockchain }) {
  const bot = new Telegraf(token);
  bot.start(ctx => {
    service.registerUser(ctx.from);
    return ctx.reply("Welcome to honktipbot, a multi-asset Bitcoin Cash CashTokens tipping bot. Use /help to begin.");
  });
  bot.help(ctx => ctx.reply([
    "/balance [SYMBOL] — show internal balances",
    "/deposit SYMBOL — get your token-aware deposit address",
    "/withdraw SYMBOL AMOUNT ADDRESS — request a withdrawal",
    "In a group, reply with AMOUNT SYMBOL to tip a user.",
    "A configured token emoji tips one token per emoji."
  ].join("\n")));
  bot.command("balance", ctx => {
    service.registerUser(ctx.from);
    const [requested] = parseCommandArgs(ctx.message.text);
    const balances = service.balances(ctx.from.id).filter(item => !requested || item.token.symbol === requested.toUpperCase());
    if (!balances.length) return ctx.reply("Unsupported token symbol.");
    return ctx.reply(balances.map(({ token, units }) => `${token.symbol}: ${formatAmount(units, token.decimals)}`).join("\n"));
  });
  bot.command("deposit", async ctx => {
    const [symbol] = parseCommandArgs(ctx.message.text);
    const token = symbol && registry.get(symbol);
    if (!token) return ctx.reply("Usage: /deposit SYMBOL");
    const address = await blockchain.depositAddress(ctx.from);
    return ctx.reply(`Deposit ${token.symbol} to this token-aware address:\n${address}\nCredits appear after the configured confirmation count.`);
  });
  bot.command("withdraw", async ctx => {
    const [symbol, amountText, address] = parseCommandArgs(ctx.message.text);
    const token = symbol && registry.get(symbol);
    if (!token || !amountText || !address) return ctx.reply("Usage: /withdraw SYMBOL AMOUNT TOKEN_AWARE_ADDRESS");
    try {
      blockchain.validateTokenAddress(address);
      const units = parseAmount(amountText, token.decimals);
      const withdrawal = service.reserveWithdrawal({ user: ctx.from, token, units, destination: address });
      await ctx.reply(`Withdrawal ${withdrawal.id} reserved and pending broadcast.`);
      await blockchain.processWithdrawals(item => notifyWithdrawal(bot, item, registry));
    } catch (error) {
      return ctx.reply(`Withdrawal rejected: ${error.message}`);
    }
  });
  bot.on("text", ctx => {
    if (!ctx.message.reply_to_message || !["group", "supergroup"].includes(ctx.chat.type)) return;
    const parsed = parseTip(ctx.message.text, registry);
    if (!parsed) return;
    try {
      const units = parseAmount(parsed.amount, parsed.token.decimals);
      service.tip({ from: ctx.from, to: ctx.message.reply_to_message.from, token: parsed.token, units });
      return ctx.reply(`${ctx.from.first_name} tipped ${formatAmount(units, parsed.token.decimals)} ${parsed.token.symbol} to ${ctx.message.reply_to_message.from.first_name}.`);
    } catch (error) { return ctx.reply(`Tip failed: ${error.message}`); }
  });
  bot.catch(error => console.error("Telegram update failed:", error.message));
  return bot;
}

export async function notifyWithdrawal(bot, item, registry) {
  const token = registry.byCategory.get(item.token_category);
  if (!token) return;
  if (item.status === "broadcast") await bot.telegram.sendMessage(item.user_id, `Withdrawal ${item.id} broadcast. Transaction: ${item.txid}`);
  if (item.status === "completed") await bot.telegram.sendMessage(item.user_id, `Withdrawal ${item.id} completed with ${item.confirmations} confirmations.`);
  if (item.status === "failed") await bot.telegram.sendMessage(item.user_id, `Withdrawal ${item.id} failed before broadcast and ${formatAmount(BigInt(item.units), token.decimals)} ${token.symbol} was refunded.`);
}
