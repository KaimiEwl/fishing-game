# Hook & Loot release tasks

Snapshot date: 2026-05-22

This checklist is for preparing the game for a real public release on `https://www.hookloot.xyz`.
The current runtime target is the owned VPS stack: `hookloot-web` + `hookloot-api` + SQLite data under `/opt/hookloot/data`.

## Current release baseline

- [x] Frontend and API runtime are on the owned server path, not the old third-party backend.
- [x] Active `src/`, `server/`, and `scripts/` scan has no direct Supabase runtime imports.
- [x] Player progress has one canonical admin/debug shape: `progress_profile`.
- [x] Guest progress is server-backed and can be linked into a wallet profile.
- [x] Core fishing smoke covers guest save/restore, guest-to-wallet link, wallet save, duplicate resolve rejection, invalid resolve token rejection, and client-authored progress rejection.
- [x] VPS production smoke passed against `https://www.hookloot.xyz`.
- [x] Admin player details return `progress_profile` from production API.

## P0 release blockers

- [x] Run a full gameplay QA pass on desktop and mobile.
  - Acceptance: fresh guest can enter, fish, reload, keep progress, link wallet, continue from the same progress, and no screen blocks gameplay.
  - Cover: lake, inventory, shop, tasks, grill, cube, map, leaderboard, settings, inbox, guide, terms, privacy, admin.

- [ ] Verify every economy-changing UI action is server-authoritative.
  - Acceptance: frontend sends intent only; API validates and stores the result.
  - Cover: cast start, cast resolve, fish sell, bait buy, rod buy/equip, cube roll, task claim, cooking, dish sell, fishing net, premium session, MON reward, wallet check-in, referral rewards.

- [ ] Finish the anti-cheat sweep for the owned API.
  - Acceptance: no request can grant coins, bait, XP, inventory, cooked dishes, rods, cube rolls, task claims, MON, or premium state by sending client-authored final state.
  - Add or verify: per-action rate limits, idempotency keys, one-use resolve tokens, duplicate tx protection, audit logs for high-value grants, clear rejection errors.

- [ ] Validate real wallet and payment flows on the target chain.
  - Acceptance: wallet connect, signature verification, chain handling, receiver address, tx confirmation, duplicate transaction rejection, failed transaction handling, and production `HOOKLOOT_ALLOW_UNVERIFIED_PAYMENTS` disabled.
  - Cover: bait purchases, MON shop actions, NFT rod mint/payment path, premium session purchases, withdraw request flow.

- [ ] Do a backup and restore drill.
  - Acceptance: create a production data backup, restore it into a separate test data directory/container, boot the API, and confirm at least one real player profile and admin `progress_profile` can be read.
  - Keep proof: backup filename, restore command, test result, rollback note.

- [ ] Fix deploy reliability after the latest VPS build OOM.
  - Acceptance: `git push vps main` completes with `[deploy] success` without manual activation.
  - Options: add swap, increase VPS memory, build locally and upload artifact, or split deploy build from activation.

- [ ] Freeze the release commit and tag it.
  - Acceptance: release commit is pushed to GitHub and VPS remote, tagged, and recorded in release notes with smoke results.

## P1 release readiness

- [ ] Build a repeatable release QA script/checklist.
  - Include commands: `npm run verify`, local `npm run ops:smoke`, production `npm run ops:smoke`, `/api/healthz`, `/admin`, VPS container health, latest backup check.

- [ ] Add a small production monitoring routine.
  - Acceptance: health endpoint, container status, disk usage, backup count, API error logs, and suspicious activity summary can be checked quickly.
  - Prefer one command or documented runbook.

- [ ] Review admin operations for launch support.
  - Acceptance: admin can search a player, inspect canonical progress, edit safe fields, see audit history, send messages, review withdrawals/social/manual queues, and recover obvious stuck states.

- [ ] Document emergency procedures.
  - Cover: rollback release, restore data backup, disable purchases, pause MON withdrawals, remove/rotate admin wallet, rotate session secret, block an abusive wallet/player.

- [ ] Complete browser/device QA matrix.
  - Desktop: Chrome, Edge, Firefox.
  - Mobile: iOS Safari, Android Chrome, small viewport, rotated viewport.
  - Wallets: browser wallet extension, mobile wallet/deep link if supported.

- [ ] Review launch economy numbers.
  - Acceptance: starting bait, daily bait, fish rewards, task rewards, cube odds, rod prices, MON rewards, premium prices, withdraw minimum, and cooldowns are recorded and approved.

- [ ] Review user-facing copy and required pages.
  - Acceptance: `/guide`, `/terms`, `/privacy`, wallet errors, purchase errors, guest link copy, and admin-only errors are understandable and not misleading.

- [ ] Decide what happens to old guest access recovery.
  - Current behavior: guest identity is stored in the browser and can be lost if storage is cleared before wallet linking.
  - Release decision: either accept this, add a guest recovery code, or make wallet linking more prominent.

## P2 polish after release candidate

- [ ] Reduce existing lint warnings in older UI/canvas files.
- [ ] Split large Vite chunks or accept the current wallet/provider bundle size with a documented note.
- [ ] Add automated Playwright coverage for the main menu/game/admin smoke paths.
- [ ] Add server-side unit tests for progress normalization, guest-to-wallet merge, and reward-critical actions.
- [ ] Add admin export/import tooling for player support and audits.
- [ ] Add a dashboard view for aggregate economy health: coins minted, bait consumed, fish sold, MON pending/withdrawable, cube prizes, top suspicious wallets.

## Required pre-release command sequence

Run from repo root:

```powershell
npm ci
npm run verify
npm run ops:smoke
```

Run against production API before and after deploy:

```powershell
$env:HOOKLOOT_API_BASE_URL='https://www.hookloot.xyz'
npm run ops:smoke
Remove-Item Env:\HOOKLOOT_API_BASE_URL -ErrorAction SilentlyContinue
```

Deploy:

```powershell
git push vps main
```

Verify VPS:

```powershell
# On VPS or via SSH:
readlink -f /opt/hookloot/current
ls -1t /opt/hookloot/backups/hookloot-data-*.tar.gz | head -3
docker compose -p hookloot -f /opt/hookloot/current/deploy/vps/compose.yml ps
curl -f https://www.hookloot.xyz/api/healthz
```

## Release notes template

- Release commit:
- Tag:
- Deployed at:
- Data backup:
- Smoke result:
- Browser QA result:
- Wallet/payment QA result:
- Known risks:
- Rollback target:
