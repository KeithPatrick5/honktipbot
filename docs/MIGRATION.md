# Migration from 1.x

Version 2 is a new framework, not a stateful upgrade of the former production service.

## Data compatibility

No automatic migration is provided. The original DynamoDB and escrow data are gone, and old records contained plaintext wallet mnemonics. Importing such records into the new ledger would create false liabilities and reintroduce compromised secrets.

The new identity key remains the Telegram user ID, but balances are keyed by CashToken category and stored as integer base units:

```text
(telegram_user_id, cashtoken_category) -> units
```

Operators building a separate migration tool must reconcile every liability against independently controlled assets and must never import mnemonic fields.

## Command changes

- `/balance` becomes `/balance [SYMBOL]`.
- `/deposit` becomes `/deposit SYMBOL` and returns a CashTokens-aware address.
- The historical withdrawal command becomes `/withdraw SYMBOL AMOUNT TOKEN_AWARE_CASHADDRESS`.
- Reply tips become `AMOUNT SYMBOL`.
- Emoji tips are registry-specific and represent one display unit per emoji.

## Removed behavior

- HONK is not hardcoded or pre-approved.
- SLP addresses and token IDs are unsupported.
- Old deposit addresses are not recognized.
- No wallet is generated for a Telegram user.
- No escrow database record or withdrawal counter exists.
- No RabbitMQ notification consumer exists.

## Git history

The repository history is preserved. Version 1 code can be inspected through Git, but must not be reused for financial operation.
