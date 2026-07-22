# Changelog

All notable changes are documented here. This project follows Semantic Versioning.

## 2.1.0 - 2026-07-22

### Added

- Real CashTokens HD hot wallet integration through mainnet-js and Electrum protocol 1.5.
- Deterministic per-user deposit addresses, persistent confirmation tracking, and one-time crediting.
- Persistent withdrawal reservation, signing, broadcast, retry, completion, and pre-broadcast refund states.
- BCH fee-funding address and chipnet/mainnet configuration.

### Removed

- Mandatory SAFE MODE and placeholder blockchain adapters.

## 2.0.0 - 2026-07-22

### Added

- Safe-by-default multi-asset CashTokens framework.
- Validated token registry with category, symbol, decimals, and optional emoji.
- User/category/base-unit balance model.
- Transactional SQLite ledger and append-only transfer entries.
- Explicit blockchain adapter interface and non-financial SAFE MODE adapter.
- Telegraf 4 handlers and Node built-in test suite.
- CI, MIT license, security policy, contribution guide, migration notes, and architecture documentation.

### Changed

- Upgraded the supported runtime from Node 10 to Node 24 LTS.
- Generalized all Telegram text and commands from HONK to configured assets.

### Removed

- SLP SDK, SLPDB, Bitcoin.com REST APIs, escrow wallet, mnemonic generation, withdrawals, deposits, DynamoDB, RabbitMQ, external deposit monitor coupling, filesystem bans, and unsafe locks.

### Security

- Removed all private-key and mnemonic handling and logging.
- Made live financial capabilities impossible to enable in this release.
- Replaced multi-write transfers with atomic database transactions.
