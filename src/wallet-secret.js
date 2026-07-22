import fs from "node:fs";

export function loadWalletMnemonic(config) {
  const mnemonic = config.walletMnemonic || fs.readFileSync(config.walletSecretFile, "utf8").trim();
  if (mnemonic.split(/\s+/).length < 12) throw new Error("Wallet mnemonic must contain at least 12 words.");
  return mnemonic;
}
