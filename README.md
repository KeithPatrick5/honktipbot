# honktipbot

> Originally released as honktipbot, now a multi-asset Telegram tipping framework for Bitcoin Cash CashTokens.

This is a single-process, custodial Telegram bot for approved fungible CashTokens. It assigns deterministic token-aware deposit addresses from one HD hot wallet, credits confirmed deposits to an internal SQLite ledger, supports atomic Telegram tips, and builds and broadcasts real CashTokens withdrawals.

The historical HONK SLP production service is not restored. Its infrastructure and data are gone, SLP is unsupported, and HONK is not hardcoded.

## Security warning

This software controls a hot wallet. Anyone who obtains its mnemonic can spend every token and all fee BCH in that wallet. Start on chipnet, keep small balances, restrict host access, back up the database and mnemonic separately, and obtain an independent review before mainnet use. The bot is custodial and is not suitable for large balances.

## Requirements and provider

- Node.js 24 LTS or newer
- npm 11 or newer
- A Telegram bot token
- A WebSocket Electrum/Fulcrum server supporting CashTokens and Electrum protocol 1.5

The implementation uses `mainnet-js` 3.1.7 and its CashTokens-aware Electrum provider. The configured `ELECTRUM_URL` is used for token-inclusive UTXO queries, block height/history, transaction submission, and confirmation tracking. No retired Bitcoin.com API is used.

## Install

```bash
git clone https://github.com/KeithPatrick5/honktipbot.git
cd honktipbot
npm ci
cp .env.example .env
cp config/tokens.example.json config/tokens.json
```

## Create the Telegram bot

Message `@BotFather` in Telegram, run `/newbot`, and put the resulting token in `BOT_TOKEN`. Disable privacy mode with `/setprivacy` if the bot must see ordinary group reply tips.

## Create or import the hot wallet

To generate a new 12-word mnemonic directly into an ignored file with mode `0600`:

```bash
WALLET_SECRET_FILE=./secrets/wallet.mnemonic npm run wallet:setup
```

The command never prints the mnemonic. Back up the file immediately. To import an existing wallet, create `secrets/wallet.mnemonic` yourself, place exactly a 12- or 24-word BIP39 mnemonic in it, and run `chmod 600 secrets/wallet.mnemonic`. Alternatively set `WALLET_MNEMONIC` in the process environment and omit `WALLET_SECRET_FILE`; avoid shell history and service-manager status output.

## Environment configuration

```dotenv
BOT_TOKEN=Telegram-token-from-BotFather
NETWORK=chipnet
ELECTRUM_URL=wss://chipnet.imaginary.cash:50004
WALLET_SECRET_FILE=./secrets/wallet.mnemonic
TOKEN_REGISTRY_PATH=./config/tokens.json
DATABASE_PATH=./data/honktipbot.sqlite
DEPOSIT_CONFIRMATIONS=2
POLL_INTERVAL_MS=30000
ADMIN_TELEGRAM_IDS=123456789
```

`NETWORK` accepts `chipnet` or `mainnet`. For mainnet, supply a trusted CashTokens-capable mainnet Electrum WebSocket URL. The bot fails at startup if required configuration, wallet material, or token configuration is invalid. Administrator IDs are reserved configuration for operational tooling; version 2 does not expose privileged Telegram commands.

## Configure tokens

Every enabled asset requires only a registry entry. Amount fields are human-readable token amounts and are converted to integer base units at startup.

```json
{
  "tokens": [
    {
      "symbol": "TOKEN",
      "name": "Community Token",
      "category": "64-hex-character-cashtoken-category-id",
      "decimals": 2,
      "minimumTip": "0.01",
      "minimumDeposit": "1.00",
      "minimumWithdrawal": "5.00",
      "enabled": true,
      "emoji": "🎪"
    }
  ]
}
```

For multiple tokens, add more objects with unique category IDs, symbols, and optional emojis. Verify category IDs independently. The all-zero category in the example file is intentionally not a real asset.

## Chipnet setup and BCH fees

Begin with `NETWORK=chipnet` and the example chipnet Electrum URL. Configure a real chipnet CashToken category, then fund the wallet with chipnet BCH and that token. At startup the bot prints only its public BCH fee-funding address. CashTokens outputs require BCH satoshis and every withdrawal consumes a transaction fee; keep the hot wallet funded with enough BCH. BCH is tracked by the wallet separately and is not an internally tippable asset.

## Run

```bash
node --env-file=.env src/index.js
```

The process polls deposits and withdrawals before launching Telegram, then repeats at `POLL_INTERVAL_MS`. Stop with `SIGINT` or `SIGTERM` for a clean database and provider shutdown.

## Telegram usage

- `/start`
- `/help`
- `/balance` or `/balance TOKEN`
- `/deposit TOKEN`
- `/withdraw TOKEN 12.5 bchtest:z...`
- Reply to a group message with `12.5 TOKEN`
- Reply with a configured emoji; each occurrence tips one whole display token

`/deposit` returns the user's deterministic token-aware address. Send only configured CashTokens to it. Deposits are stored by transaction ID, output index, category, user, amount, height, confirmations, and status. They are credited once after `DEPOSIT_CONFIRMATIONS`. Pending outputs survive restarts; disappearing unconfirmed outputs are marked orphaned.

Withdrawals validate the token-aware address, network, amount, configured minimum, and internal balance. The amount is reserved atomically. The bot signs a CashTokens transaction with the hot wallet, stores the raw transaction and computed transaction ID, and broadcasts it. A restart rebroadcasts the identical signed transaction rather than creating another payment. Construction failures before broadcast refund automatically; ambiguous broadcast errors stay signed for safe retry. Telegram reports reserved, broadcast, completed, and pre-broadcast failed/refunded states.

## Backups

Back up both:

1. `secrets/wallet.mnemonic` — controls on-chain assets.
2. `data/honktipbot.sqlite` — records user liabilities, deposit assignments, ledger entries, and withdrawals.

For a consistent SQLite backup, stop the bot before copying the database, or use SQLite's online backup command. Losing either component can make liabilities unrecoverable. Never commit or paste either file.

## Tests and checks

```bash
npm test
npm run check
npm run test:coverage
npm audit
```

Automated tests use injected providers and wallets and never access a blockchain. The production adapter uses real `mainnet-js` transaction construction and broadcasting.

## Known limitations

- Single process and SQLite only; do not run multiple bot replicas against one wallet/database.
- Deposit discovery polls assigned addresses and credits unspent token outputs. Do not externally spend wallet outputs while the bot is running.
- Confirmed credits are not automatically reversed after deep reorganizations; configure a prudent confirmation count.
- Ambiguous broadcast failures remain pending for rebroadcast and require operator investigation if they never resolve.
- No automated wallet sweeping, fee alerts, administrator commands, or balance reconciliation dashboard.
- The Electrum server can affect availability and reported chain state; operate or select a trusted server.
- Hot-wallet custody remains the primary risk.

## License

MIT. See [LICENSE](LICENSE).
