# Live Ops Checks

Working Supabase project:
- `oyhyoqnhqifcwjyputif`

This pack is for fast live checks without digging through old notes.

## Required inputs
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- admin wallet address
- a valid wallet session token from the browser, or a locally generated token if `SESSION_TOKEN_SECRET` is available

Browser session storage key:
- `monadfish_session`

## Helper scripts
- `scripts/ops/make-session-token.mjs`
- `scripts/ops/invoke-edge.ps1`
- `scripts/ops/smoke-live-readonly.ps1`
- `scripts/ops/smoke-live-mutation.mjs`

## Generate a session token locally
If you know the session secret:

```powershell
$env:SESSION_TOKEN_SECRET="your-secret"
node .\scripts\ops\make-session-token.mjs --wallet 0xYourWallet
```

If you do not know the secret, copy the token from browser local storage:
- open devtools
- `localStorage.getItem('monadfish_session')`

## Read-only smoke pass
This does not mutate live data.

```powershell
.\scripts\ops\smoke-live-readonly.ps1 `
  -WalletAddress 0xYourAdminWallet `
  -SessionToken "paste-session-token"
```

It checks:
- admin auth
- withdraw queue summary
- weekly payout preview
- suspicious summary + suspicious players
- player MON summary

## Full mutation smoke
This script creates a temporary wallet player, runs the new reward-critical server actions, and cleans up after itself.

Required env:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- optional `ADMIN_WALLET_ADDRESS`

```powershell
$env:SUPABASE_URL="https://oyhyoqnhqifcwjyputif.supabase.co"
$env:SUPABASE_ANON_KEY="legacy-anon-or-publishable-key"
$env:SUPABASE_SERVICE_ROLE_KEY="legacy-service-role-key"
$env:ADMIN_WALLET_ADDRESS="0x0266bd01196b04a7a57372fc9fb2f34374e6327d"
node .\scripts\ops\smoke-live-mutation.mjs
```

It covers:
- real `verify-wallet` for temporary generated wallets
- temporary admin role grant
- admin auth
- weekly payout preview
- suspicious summary + suspicious players
- server task claim
- server cube roll + reward apply
- server grill cook + dish sell
- social task admin verification scaffold
- MON summary
- withdraw request -> approve -> paid
- cleanup of temporary player rows

## Manual live checks to run after deploy
### Cube MON
1. Use a wallet with cube rolls available
2. Open cube screen
3. Roll until a `MON` cell appears
4. Confirm ledger row is created in `player_mon_rewards`
5. Confirm reward appears in `Settings -> MON Rewards`

### Weekly payouts
1. Open `/admin`
2. Go to `Weekly`
3. Verify preview matches current `grill_leaderboard`
4. Apply weekly payout once
5. Confirm:
   - new `weekly_grill_payout_batches` row
   - new `player_mon_rewards` rows with `source_type = weekly_grill_top`
   - rerunning apply is blocked for the same week

### Admin MON grant
1. Open `/admin`
2. Open player details
3. Use `+1 MON` or `+5 MON`
4. Confirm:
   - `player_mon_rewards` row exists
   - player sees hold or withdrawable balance in `Settings`

### Withdraw flow
1. Give player at least `1 MON`
2. Wait or use already-withdrawable test balance
3. Player creates withdraw request
4. Admin approves
5. Admin marks paid with tx hash
6. Confirm request status changes and balance summary updates

### Reward action layer
1. Claim a task with a verified wallet
2. Cook a recipe and sell a cooked dish
3. Check:
   - coins/bait update from server response
   - leaderboard updates through `player-actions`
   - no client-side stale overwrite after refresh

## Live functions expected after the overnight pass
- `admin`
- `player-mon`
- `player-actions`
- `verify-wallet`
- `save-player-progress`

## Live tables expected after the overnight pass
- `player_mon_rewards`
- `mon_withdraw_requests`
- `player_cube_rolls`
- `weekly_grill_payout_batches`
- `social_task_verifications`
- `edge_rate_limits`

## Main regression checklist
- wallet verify
- referral payout
- save sync by wallet
- admin inbox/messages
- MON withdraw queue
- cube roll and reward resolution
- grill cook/sell/leaderboard
