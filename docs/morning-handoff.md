# Morning Handoff

Working Supabase project:
- `oyhyoqnhqifcwjyputif`

This file is the shortest path back into the project tomorrow.

## First 10 minutes
1. Run a live read-only snapshot:
   - `npm run ops:report -- -WalletAddress 0xYourAdminWallet -SessionToken "paste-session-token"`
2. If the report looks normal, run the broader read-only smoke:
   - `npm run ops:smoke:readonly -- -WalletAddress 0xYourAdminWallet -SessionToken "paste-session-token"`
3. Only run mutation smoke if you want a full live systems check with temporary wallets:
   - `npm run ops:smoke:mutation`

## What is ready now
- wallet-linked cross-device save
- referral rewards
- admin inbox/messages
- MON ledger and manual withdraw queue
- server-authoritative cube reward path
- MON prizes on cube
- weekly grill payout preview/apply engine
- suspicious activity overview in `/admin`
- player social task submit -> admin verify -> player claim flow

## Best next product work
### 1. Weekly event rollout
- Decide whether to manually apply the first weekly payout from `/admin`
- Confirm payout amounts and cutover timing before doing that on live data

### 2. Social task rewards policy
- Decide which social tasks should pay coins, bait, or MON
- Right now the scaffold is ready, but most social rewards are intentionally conservative/manual

### 3. Social service integration decision
- `Twitter/X` follow/repost/like verification still needs an external strategy
- `Discord` join verification still needs a bot strategy
- `Telegram` join verification still needs a bot/deep-link strategy
- If no service is chosen yet, keep manual/admin verification for v1

### 4. Marketing content pack
- Create meme images
- Create post copy variants
- Create CTA lines for wallet connect / referrals / MON rewards

## Things that are intentionally not live-automated yet
- weekly cron auto-payout
- automatic on-chain MON payouts
- domain rollout
- social auto-posting
- social auto-verification through third-party APIs or bots

## Useful commands
- Generate a session token if you know the secret:
  - `npm run ops:session -- --wallet 0xYourWallet`
- Read-only admin smoke:
  - `npm run ops:smoke:readonly -- -WalletAddress 0xYourAdminWallet -SessionToken "paste-session-token"`
- Live ops report:
  - `npm run ops:report -- -WalletAddress 0xYourAdminWallet -SessionToken "paste-session-token"`
- Full live mutation smoke:
  - `npm run ops:smoke:mutation`

## Important notes
- Do not use the old/non-working Supabase project.
- Keep using the working project `oyhyoqnhqifcwjyputif`.
- Local-only files should stay untouched unless intentionally needed:
  - `public/assets/pepe_final.png`
  - `crop.py`
  - `supabase/.temp/`
