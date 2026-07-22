import fs from "node:fs";
import path from "node:path";
import { generateBip39Mnemonic } from "@bitauth/libauth";

const target = path.resolve(process.cwd(), process.env.WALLET_SECRET_FILE || "secrets/wallet.mnemonic");
if (fs.existsSync(target)) throw new Error(`Refusing to overwrite existing wallet secret: ${target}`);
fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
fs.writeFileSync(target, `${generateBip39Mnemonic()}\n`, { mode: 0o600, flag: "wx" });
console.log(`Created a new wallet secret at ${target}. Back it up securely; its contents were not printed.`);
