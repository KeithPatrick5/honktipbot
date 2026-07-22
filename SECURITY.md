# Security policy

## Supported versions

Only the latest 2.x release is supported. Historical 1.x revisions are retained for history and must not be deployed.

## Reporting

Report vulnerabilities privately to the repository maintainers through GitHub's private vulnerability reporting feature. Do not include real secrets, private keys, funds, or personal user data in a report.

## Security properties of 2.0

- Wallet mnemonics are accepted only from the environment or an ignored operator file and are never logged.
- The setup command writes a new mnemonic directly to a mode `0600` file without printing it.
- CashTokens transactions are signed by a single hot wallet through `mainnet-js`.
- Balances use arbitrary-precision integer base units.
- Tips update both sides inside one SQLite transaction.
- The token registry is an explicit allow-list.

## Historical warning

Old revisions logged generated user mnemonics and could log a derived escrow WIF. Any surviving historical logs, DynamoDB backups, `.env` files, or wallet material must be treated as compromised. Do not reuse historical keys.

## Operational requirements

Mainnet operators must independently review key management, node trust, CashToken categories, confirmations, reorg policy, accounting reconciliation, rate limits, backups, monitoring, and incident response. Keep only small community balances in the hot wallet.
