import { createApplication, poll } from "./app.js";

const app = await createApplication();
let polling = false;
const runPoll = async () => {
  if (polling) return;
  polling = true;
  try { await poll(app); }
  catch (error) { console.error("Blockchain polling failed:", error.message); }
  finally { polling = false; }
};

await runPoll();
await app.bot.launch();
const timer = setInterval(runPoll, app.config.pollIntervalMs);
console.log(`honktipbot started on ${app.config.network} with ${app.registry.tokens.length} approved token(s).`);
console.log(`Fund BCH fees at: ${app.blockchain.feeAddress()}`);

const stop = async signal => {
  clearInterval(timer);
  app.bot.stop(signal);
  await app.blockchain.stop();
  app.ledger.close();
};
process.once("SIGINT", () => void stop("SIGINT"));
process.once("SIGTERM", () => void stop("SIGTERM"));
