# Modernization report

The dormant HONK SLP bot is now a Telegram-only, multi-asset CashTokens bot. The legacy SLP SDK, Bitcoin.com endpoints, DynamoDB, RabbitMQ, per-user mnemonic storage, shared HONK fields, unsafe locks, and two-write transfers were removed.

## Replacements

- Node 10 → Node 24 LTS
- Telegraf 3 → Telegraf 4.16.3
- SLP SDK and retired REST APIs → mainnet-js 3.1.7 with CashTokens Electrum protocol 1.5
- DynamoDB sessions → SQLite user, balance, deposit, ledger, and withdrawal tables
- per-user wallets → deterministic addresses from one operator hot wallet
- non-atomic transfers → `BEGIN IMMEDIATE` SQLite transactions
- transient withdrawals → reserved, signed, broadcast, completed, and failed persistent states

## Implemented financial path

- Approved token categories and amount minimums are configuration-only.
- Confirmed UTXOs are credited exactly once.
- Tips use integer base units and one atomic transaction.
- Withdrawals reserve first, sign and persist bytes, broadcast, retry idempotently, and refund definite pre-broadcast failures.
- BCH is retained in the hot wallet for token output satoshis and miner fees, not internal tipping.

## Known follow-up work

- Independent security review before material mainnet funds.
- Automated fee-low and wallet/liability reconciliation alerts.
- Administrator status and recovery commands.
- Persistent Telegram abuse controls.
- Deep-reorganization operator procedure.
- Telegram handler integration tests against a mocked Bot API.
