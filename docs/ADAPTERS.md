# CashTokens integration

The production path uses `MainnetCashAdapter`, `mainnet-js` 3.1.7, and one configured CashTokens-capable Electrum WebSocket server.

## Deposits

Each Telegram user receives a deterministic token-aware address from the operator's HD wallet. The poller requests token-inclusive UTXOs for every assigned address, stores approved categories, calculates confirmations from the Electrum tip height, and credits through a unique deposit ledger reference. Pending UTXOs that disappear are marked orphaned.

## Withdrawals

The adapter constructs `TokenSendRequest` outputs, calls `HDWallet.encodeTransaction`, computes the TXID locally, and persists the signed raw transaction before calling `submitTransaction`. A restart or ambiguous network error rebroadcasts the same bytes. Only construction failures before signing/broadcast refund automatically.

## Trust boundary

The Electrum server reports UTXOs, history, and chain height. The local wallet signs without sending its mnemonic to the server. The mnemonic remains in process memory because this is deliberately a small hot-wallet design.
