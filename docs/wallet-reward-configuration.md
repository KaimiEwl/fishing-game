# Wallet And Reward Configuration

This guide separates public client configuration from server-only reward settings. Use placeholders in public examples and keep real values in local or production environment files only.

## Public Client Values

These values may be exposed to the browser because they configure UI behavior or public network integration.

```env
VITE_BASE_PATH=/
VITE_WALLETCONNECT_PROJECT_ID=<walletconnect-project-id>
VITE_BAIT_BUCKETS_V2_ENABLED=true
VITE_WALLET_BAIT_BONUS_ENABLED=true
VITE_REFERRAL_BAIT_ENABLED=true
VITE_LEGACY_DAILY_BONUS_DISABLED=true
VITE_PLAYER_AUDIT_LOGS_ENABLED=true
VITE_SOCIAL_X_TARGET_USERNAME=<x-profile-name>
VITE_SOCIAL_X_PROFILE_URL=<x-profile-url>
```

Never put private keys, session secrets, admin tokens, or private wallet credentials in `VITE_*` variables. Vite embeds those values into the browser bundle.

## Server-Only Values

These values must stay on the API server or in a local `.env` that is ignored by Git.

```env
HOOKLOOT_API_PORT=8787
HOOKLOOT_DATA_DIR=./server/.data
HOOKLOOT_SESSION_SECRET=<long-random-secret>
HOOKLOOT_RECEIVER_ADDRESS=<receiver-wallet-address>
HOOKLOOT_ADMIN_WALLETS=<comma-separated-admin-wallets>
MONAD_RPC_URL=<rpc-url>
```

Reward and payment test flags should be off for production:

```env
HOOKLOOT_MONAD_SHOP_TEST_MODE_ENABLED=0
HOOKLOOT_MONAD_TEST_DROPS_ALWAYS=0
HOOKLOOT_ALLOW_UNVERIFIED_PAYMENTS=0
HOOKLOOT_WALLET_CHECK_IN_REPEAT_TEST_MODE=0
```

## Local Development

1. Copy `.env.example` to `.env`.
2. Fill only the values needed for the feature being tested.
3. Keep `.env`, `.env.local`, `.env.production`, database files, logs, and uploaded data out of Git.
4. Run the local verification gate before opening a pull request.

```sh
npm run verify
```

For API-backed gameplay checks:

```sh
npm run ops:smoke
```

## Production Safety Checklist

- Confirm `HOOKLOOT_ALLOW_UNVERIFIED_PAYMENTS=0`.
- Confirm receiver and admin wallet addresses are intentional.
- Confirm session secrets are long, random, and not reused from public examples.
- Confirm the production API uses server-side validation for reward-critical actions.
- Confirm no real wallet addresses, secrets, session tokens, private hosts, or database paths are committed.

## Related Docs

- `SECURITY.md`
- `docs/vps-deploy.md`
- `docs/ops-live-checks.md`
