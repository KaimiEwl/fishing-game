# Owned API Ops Checks

This pack is for fast checks against the Hook & Loot API that runs on our server.

## Required inputs
- `HOOKLOOT_API_BASE_URL`, defaults to `http://127.0.0.1:8787`
- admin wallet address
- a valid wallet session token from the browser, or a locally generated token if `HOOKLOOT_SESSION_SECRET` / `SESSION_TOKEN_SECRET` is available

Browser session storage key:
- `monadfish_session`

## Helper scripts
- `scripts/ops/make-session-token.mjs`
- `scripts/ops/invoke-edge.ps1`
- `scripts/ops/live-ops-report.ps1`
- `scripts/ops/smoke-readonly.ps1`
- `scripts/ops/smoke-api.mjs`

Convenience npm scripts:
- `npm run ops:session -- --wallet 0xYourWallet`
- `npm run ops:report -- -WalletAddress 0xYourAdminWallet -SessionToken "paste-session-token"`
- `npm run ops:smoke:readonly -- -WalletAddress 0xYourAdminWallet -SessionToken "paste-session-token"`
- `npm run ops:smoke`

## Generate a session token locally
If you know the session secret:

```powershell
$env:HOOKLOOT_SESSION_SECRET="your-secret"
node .\scripts\ops\make-session-token.mjs --wallet 0xYourWallet
```

If you do not know the secret, copy the token from browser local storage:
- open devtools
- `localStorage.getItem('monadfish_session')`

## Read-only smoke pass
This does not mutate data.

```powershell
.\scripts\ops\smoke-readonly.ps1 `
  -WalletAddress 0xYourAdminWallet `
  -SessionToken "paste-session-token" `
  -BaseUrl "https://www.hookloot.xyz"
```

It checks:
- admin auth
- withdraw queue summary
- weekly payout preview
- suspicious summary + suspicious players
- player MON summary

## API mutation smoke
This script creates a temporary wallet player and runs server-owned gameplay actions.

```powershell
$env:HOOKLOOT_API_BASE_URL="http://127.0.0.1:8787"
node .\scripts\ops\smoke-api.mjs
```

For local fake-payment coverage:

```powershell
$env:HOOKLOOT_ALLOW_UNVERIFIED_PAYMENTS="1"
$env:HOOKLOOT_SMOKE_FAKE_PAYMENTS="1"
node .\scripts\ops\smoke-api.mjs
```

It covers:
- wallet verify
- server progress save
- server fishing cast start/resolve
- optional fake-payment coin/net/cube purchase checks
- cube roll/apply when rolls are available
- MON summary
- grill leaderboard write

## Live ops report
This is a broader read-only JSON snapshot for admin wallets.

```powershell
.\scripts\ops\live-ops-report.ps1 `
  -WalletAddress 0xYourAdminWallet `
  -SessionToken "paste-session-token" `
  -BaseUrl "https://www.hookloot.xyz"
```

It includes:
- admin auth result
- withdraw summary
- pending withdraw requests
- weekly payout preview + recent weekly batches
- suspicious summary + suspicious players
- pending social verifications
- verified social tasks ready to claim

## Main regression checklist
- wallet verify
- save sync by wallet
- server fishing cast and reward resolution
- server shop purchases
- admin inbox/messages
- MON withdraw queue
- cube roll and reward resolution
- grill cook/sell and leaderboard update
