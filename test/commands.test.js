import test from "node:test";
import assert from "node:assert/strict";
import { parseCommandArgs } from "../src/bot/create-bot.js";

test("Telegram command arguments parse consistently", () => {
  assert.deepEqual(parseCommandArgs("/withdraw@honktipbot TOKEN 12.5 bchtest:zaddress"), ["TOKEN", "12.5", "bchtest:zaddress"]);
  assert.deepEqual(parseCommandArgs("/deposit TOKEN"), ["TOKEN"]);
  assert.deepEqual(parseCommandArgs("/balance"), []);
});
