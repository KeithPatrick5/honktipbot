# Contributing

Thank you for helping modernize honktipbot.

## Development workflow

1. Use Node.js 24 LTS or newer.
2. Run `npm ci`.
3. Use chipnet and synthetic test fixtures; never test pull requests with mainnet funds.
4. Make focused changes with tests.
5. Run `npm run check` and `npm run test:coverage`.
6. Update documentation and `CHANGELOG.md` for user-visible changes.

Do not put tokens, seed phrases, WIFs, credentials, production addresses, database exports, or user data in issues, fixtures, logs, commits, or pull requests. Test values must be unmistakably synthetic.

## Financial adapters

Changes that add blockchain access, custody, deposits, or withdrawals need a threat model, idempotency design, reorg and confirmation policy, reconciliation strategy, operational runbook, and independent security review. Such a change must not silently weaken SAFE MODE.

The project does not accept changes that restore the old SLP implementation.
