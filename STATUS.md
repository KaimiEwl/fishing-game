# STATUS

## Wallet streak special task
- `Special -> Wallet streak check-in` is now a separate wallet-linked task instead of reusing the ordinary `Daily check-in`.
- The flow now expects one verified micro-transaction (`0.0001 MON`) to the configured receiver address, then verifies it against Monad RPC through the existing backend action layer before marking today's special task ready.
- The task card now shows the current consecutive-day streak, whether today is already checked in, and exposes an explicit `Check in with MON` action for verified wallets.
- No new table was added for this feature: daily streak history is derived from `player_audit_logs` events of type `wallet_daily_check_in`, so it stays additive and queryable without a schema migration.

## Social task placeholder mode
- The player-facing `Tasks -> Social` tab no longer shows the manual submit / review / claim workflow for now.
- It only shows platform icons as placeholders, and tapping any of them now displays `Coming soon` instead of exposing a half-live verification flow to players.
- The backend social-task scaffold and admin review tools remain in the repo; only the player-side UI is hidden behind the placeholder state.

## Daily invite special task
- `Special -> Invite a friend` now awards `10 bait` instead of `1000 gold`.
- The task is now treated as a daily special objective: its progress/claim state resets with the day instead of staying one-time forever.
- Daily completion is now based on today's new `referrer_attached` events, not on lifetime `rewarded_referral_count`, so it can still complete after the main inviter payout cap of `10` rewarded referrals is exhausted.

## Cube MON tile visibility
- `MON` prize cells on the cube are now visually emphasized even before reveal with a brighter emerald treatment and an explicit `1 MON` label rendered directly on the tile so players can immediately spot the winning MON cells on cube faces.

## Admin player list accuracy
- `/admin -> Players` now marks wallets with admin access using an `Admin` / `Superadmin` badge in the nickname column instead of leaving them visually indistinguishable from regular players.
- `Catches` in the admin player list now falls back to counted `fish_caught` audit events when `players.total_catches` is still `0`, so the table no longer shows false zeroes for players whose progress sync lagged behind their live catch history.
- The fallback is additive only: stored `players.total_catches` still wins whenever it is already greater than or equal to the audit-derived count.

## UI architecture refactor
- UI refactor backup created before the component cleanup:
  - `C:\Video Test\N8N_API_ACTIVE_BUSINESSSTORIES_2026-02-17\FISHING GAME\backup_bright-greet-forge-main_ui_refactor_20260418_070746.zip`
- Introduced a repo-level `Wrapper` layout primitive for gap / direction / alignment composition without cosmetic override props
- Removed external `className` / `style` visual override APIs from the main icon components (`FishIcon`, `CoinIcon`, `WaterLily`) and converted call sites to semantic props
- Rebuilt `InventoryDialog` around internal visual variants and extracted inventory trigger / fish row / rod card pieces into shared `src/components/`
- Extracted `LakeScene` helper visuals (`LakeCloud`, `LakeDetailedTree`, `LakeWaveLayer`, `LakeReedCluster`) out of the screen file so the scene is assembled from components instead of local inline definitions
- Extracted `Admin` page-local UI helpers into shared components (`AdminStatCard`, `AdminSortableHead`, `AdminTopList`, `AdminEditField`) so the page is now composed from `src/components/`
- Simplified the unused `NavLink` wrapper to a semantic `tone` API instead of raw class-based styling hooks
- Moved guide / legal / not-found route chrome into shared components (`ContentPageShell`, `DocumentSection`, `GuideSectionCard`, `NotFoundState`) so content pages are assembled from `src/components/` instead of carrying their own visual shell
- Extracted another batch of HUD / onboarding helpers (`PlayerStatItem`, `PlayerFishInfoRow`, `PlayerLevelAvatar`, `GameStateNotice`, `BiteMeter`, `RodPreviewBadge`, `WelcomeBackdrop`, `WelcomeFeatureItem`, `WelcomeConnectCta`) to keep `PlayerPanel`, `GameControls`, and `WelcomeScreen` focused on composition instead of inline visual assembly

### Validation for UI architecture refactor
- `npm run build` - passed
- `npm run lint` - passed with warnings only, no errors

## Release prep
- Release backup created before final prep:
  - `C:\Video Test\N8N_API_ACTIVE_BUSINESSSTORIES_2026-02-17\FISHING GAME\backup_bright-greet-forge-main_release_20260418_002505.zip`
- Added a repo-local GitHub Pages build helper: `npm run build:pages`
- Added `.nvmrc` with Node `20` to match CI
- Updated `README.md` with concrete release, env, and deployment steps instead of only the generic Lovable template
- Release validation status:
  - `npm run build` - passed
  - `npm run build:pages` - passed
  - `npm run lint` - still fails on pre-existing repo-wide ESLint debt
  - `tests` - not found in `package.json`

## Milestone 3 status
Completed.

### Delivered in milestone 3
- added an in-game guide page with game rules, progression overview, wallet/account notes, and reward-system explanations inspired by the requested whitepaper-style reference
- linked the guide into the player/account panel alongside the existing legal pages so it is reachable without leaving the app shell
- added lightweight cheerful background music that starts after user interaction, respects mute state, and pauses on tab hide
- fixed wallet connect/account actions inside the settings dialog by closing the settings modal before opening the RainbowKit modal on both desktop and mobile
- kept the new audio path dependency-free by using a small WebAudio loop instead of shipping a new media file
- gave `Purple Fish` a unique animated presentation with a soft aura, shimmer sweep, and light-band treatment so its cutout looks intentional rather than rough in fish lists and inventory
- replaced the cube screen background with the new `cube.png` art from local downloads via a cache-busted `bg_wheel_v2.png` asset
- fixed the cube reveal path for awkward camera angles by showing the active face selection on a front-facing overlay, so the prize walk is always visible instead of fading into a semi-transparent side
- removed the duplicate cube reveal highlight so the front-facing overlay is now the only active prize-walk UI during reveal instead of competing with the 3D cube face behind it
- hid the 3D cube entirely during the reveal step so the prize walk now renders on a single overlay only, eliminating the remaining “double cube” look
- replaced the cube background with a cleaner text-free `bg_wheel_v3.png` and removed visible `Monad` / `MonadFish` branding from loading, welcome, wallet signing copy, guide/legal pages, grill copy, and other player-facing UI strings
- refreshed both boot-loading layers with the new `loading_art_v2.png` artwork and removed the remaining visible `MonadFish` label from the HTML boot loader
- added the new `title_banner_v1.png` title card to the boot loader, in-app loading screen, and welcome screen so the game name is shown through one shared banner asset instead of plain text headings
- switched the visible project name to `Hook & Loot` in app title/meta, wallet-facing labels, and guide copy, and added the shared title banner into the guide page header
- expanded the equipped rod preview badge next to `Cast Line` so the purchased rod art now fills the full icon area instead of sitting as a tiny image inside a black square
- fixed the starter rod preview badge so the non-square `rod_basic.png` now renders with its own contain/scale treatment instead of stretching into a broken thin strip
- reduced the critical boot asset set so heavy HUD art now loads as warm preload instead of blocking first paint, and normalized the cube info/result panels back to one shared visual style
- removed the separate cube reveal overlay so tile selection now happens directly on the snapped 3D cube face, and shifted the fishing line origin forward to the actual rod tip peak on the boat sprite
- replaced the rough fishing-line rod-tip estimate with a sprite-anchored rod-tip point so the line now starts from the real visible end of the rod on `pepe_boat_v2.png`
- changed cube reveal so the real rolled face rotates into one consistent readable angle before the prize-walk highlight begins, without copying prizes onto a fake front face
- restored normal page scrolling on `Guide`, `Terms`, and `Privacy` routes while preserving the no-scroll game shell on the main fishing screen
- fixed mobile wallet binding by restoring the stock RainbowKit MetaMask mobile / QR / deep-link flow whenever no extension-style injected provider exists, while keeping the desktop MetaMask extension path intact
- removed the cube test-mode panels and rebuilt the cube screen into a cleaner flow: daily tasks grant 3 cube rolls, the screen now uses a new `Roll Cube` banner plus a `Buy Roll` icon action, the cube itself only shows guidance to finish tasks or come back tomorrow, and the starter rod preview now uses the new square icon asset

### Validation for milestone 3
- `npm run lint` - passed with warnings only, no errors
- `npm run build` - passed
- `npm run build:pages` - passed

### Notes from validation
- repo-wide ESLint errors are now cleared; remaining output is limited to warnings
- builds still report large chunk warnings from the existing app bundle, but the site compiles successfully for local and GitHub Pages output

## Session start
- Backup created before new milestone work:
  - `c:\Video Test\N8N_API_ACTIVE_BUSINESSSTORIES_2026-02-17\backups\bright-greet-forge-main_20260416_200316`
- `AGENTS.md`, `PLANS.md`, and `STATUS.md` were missing and have now been created.
- `AGENTS.md` was then updated to the newer user-provided project workflow template and should be treated as the active repo instruction file.

## Current objective
Stabilize the main fishing screen into a cleaner playable vertical slice with a working core loop and without the obvious UI regressions called out on the latest review screenshots.

## Milestone 1 status
Completed.

### Delivered in milestone 1
- replaced the always-open level block with a compact expandable level control on both desktop and mobile
- restored the bottom arcade navigation with a cropped strip asset so the menu art sits in the right place again
- removed the stray Contact button from the main lake screen
- reduced and repositioned the Travel button on desktop
- changed the main fishing CTA so it changes by actual game state instead of hover state
- removed the duplicate bite popup CTA and replaced it with a bite progress strip above the main button
- upgraded lake readability: denser underwater shading, stronger moon glow, more visible meteors
- refreshed the inventory trigger styling to match the current game UI better

## Validation checklist for milestone 1
- `npm run build` - passed
- `npm run lint` - fails because of pre-existing repo-wide ESLint issues unrelated to this milestone

### Notes from validation
- build is green after the main-screen stabilization changes
- lint still reports old issues such as `no-explicit-any`, `react-refresh/only-export-components`, and `no-require-imports` in existing files outside the targeted gameplay/UI fix set
- no new critical build failures were introduced by this milestone

## Milestone 2 status
In progress.

### Completed tasks
- reviewed the current fishing loop in `useGameState` and `useGameProgress` to confirm the core path already exists end-to-end: cast -> wait -> bite -> reel -> result -> inventory/progress update
- moved the bottom arcade navigation back into an overlay position so it no longer steals scene height or leaves a dead black strip under the lake
- removed the rectangular hover/active frames from the bottom menu and switched to a softer glow that sits behind the art instead of boxing each button
- re-centered the main `Cast` CTA above the bottom menu and kept the rod badge separate so the button itself stays visually centered
- restyled the `Inventory` trigger into the same arcade/button language as the rest of the HUD
- tightened the Travel Map preview cards so the hover/active zone follows the card shape instead of a larger square hit box
- re-cut the `Volcano Grill` map card into a cleaner rounded rectangle so it no longer drags extra padding around the icon
- stabilized the inventory modal layout so narrow dialog width no longer forces fish and rod rows into a broken single-line layout
- removed the inventory dialog's horizontal overflow path by widening the modal slightly, constraining inner content with `min-w-0`, and moving quantity / sell actions onto a dedicated bottom row
- restructured rod cards to use a two-row grid so the equip action stays visible instead of clipping off the right edge
- reworked the cube reward flow so it is no longer hardcoded to the center tile of the front face; the cube now stops on a random face and then a running glow selects the winning tile on that face
- removed the old winner arrow and switched to tile glow/highlight feedback on the active cube face
- expanded cube rewards to support both coin prizes and fish prizes, with fish tiles reusing the same fish art and relative rarity weighting from the fishing table
- added a dedicated inventory-only fish reward path for cube prizes so rewarded fish do not incorrectly grant catch XP or daily-task catch progress
- cleaned the `Volcano Grill` travel-map asset corners so the preview no longer shows a square brown backing outside the rounded card shape
- swapped the missed-catch result card to a new illustrated `The fish got away...` panel and added a large XP reward readout under it
- replaced the inventory trigger art with the new `Inventory...` banner asset from local downloads, switched it to a cache-busted asset path, and kept the fish-count badge on top
- raised the desktop cast/rod controls further so the cast button and rod badge clear the bottom arcade strip more reliably
- reduced the in-scene wait/cast/reel prompt sizes so they interfere less with the lake view on desktop and mobile
- unified the boat/rod geometry used by the render loop and cast animation so the fishing line starts from the same rod-tip point on both desktop and mobile
- replaced the four shop / rod inventory upgrade icons with the new green, blue, purple, and gold rod art from local downloads
- added a new `Boost` purchase button under `Travel` on the fishing screen with a MON payment dialog flow
- removed the visible `Locked target` preview from the cube screen so the selected reward stays hidden until reveal
- reworked cube spin settling so each roll snaps back onto the exact chosen face before the tile-reveal sequence starts
- changed the cube glow path to a neighbor-by-neighbor serpentine route across the 5x5 face to avoid odd jumpy highlight movement
- added paid cube spins for `1 MON` each with persistent extra-roll tracking outside the daily free roll
- tightened shared leaderboard sync so remote entries refresh on leaderboard open, app focus, and periodic polling instead of only once on boot
- updated Supabase typings for `grill_leaderboard` so shared leaderboard requests no longer rely on unsafe cast fallbacks in code

### Validation for milestone 2
- `npm run build` - passed
- `npm run lint` - still fails on the same pre-existing repo-wide ESLint issues outside this milestone
- `tests` - no test script currently exists in `package.json`

### Unresolved issues
- repo-wide lint debt remains in older files such as `MonadFishCanvas.tsx`, admin pages, UI primitives, and Supabase function code
- main-loop behavior still needs a hands-on gameplay pass in browser/mobile to confirm feel and timing after the layout fixes
- remaining backlog items should continue milestone-by-milestone even when an existing queued item is edited mid-thread; this needs to stay explicit in follow-up execution, not inferred from the last single screenshot alone

### Next recommended step
- manually verify the fishing screen on desktop and mobile with the new missed-catch / inventory art and the adjusted rod-line anchor, then continue with any remaining main-loop friction in cast/bite/hook/reward feedback before touching secondary tabs again

## Known local dirty files before milestone completion
- `public/assets/pepe_final.png`
- `crop.py`

These should not be staged unless they become part of an intentional task.

## Recent UI follow-up
- cube actions now use English popup dialogs: unfinished daily rolls route to `Tasks`, and `Buy Roll` opens wallet connect when no wallet is attached
- wallet connect from `Settings` now waits for the settings dialog to close before opening RainbowKit, which avoids the non-clickable mobile wallet menu overlay
- guest fishing progress now persists locally as well: coins, bait, fish inventory, owned/equipped rods, NFT rods, level, XP, and catches survive reloads without a wallet
- wheel tab now uses lighter assets and warm-preloads the current wheel background + action buttons instead of outdated files, reducing the delay when opening the cube screen
- major UI art now uses adapted sizes instead of oversized originals on the boot loader and core HUD: the boat sprite, title banner, loading art, rod previews, inventory/boost shortcuts, inventory panel, fish-got-away panel, and bottom nav strip all switched to lighter assets
- bug hardening pass: removed the cube's leftover test reward fallback, made daily task claims atomic against rapid double-clicks, stopped preloading the full map asset set during boot, and blocked wallet progress saves from sending client-authored economy payloads to `verify-wallet`
- polish pass: leaderboard polling now only runs while the leaderboard tab is open, the dead wallet `saveProgress` hook path is gone, the settings avatar fallback uses player initials instead of `MF`, and the tasks cube status copy no longer says rolls are "being prepared"
- perf pass: non-fishing tabs now lazy-load from `FishingGame`, so tasks/shop/grill/cube/map/leaderboard move into separate chunks instead of inflating the first-screen JS bundle
- bait economy v2 is now wired in as a low-risk extension instead of a loop rewrite: players keep their existing `bait` bucket for purchased/rewarded bait, gain a separate `daily_free_bait` bucket that resets to exactly `30` on each UTC day, and casts now spend daily free bait first before touching reserve bait
- verified wallet sessions now refresh on focus/visibility/poll so server-side referral bait rewards appear in the live HUD, and the client shows a toast when a new referral wallet connect grants `+10 bait`
- first wallet verification now grants a one-time `+10` reserve bait on the server, referral links can attach one immutable referrer and pay `+10` reserve bait to the inviter for up to `10` lifetime rewarded referrals, and the client sync path tracks server-granted bait deltas without wiping local fishing progress
- `Settings` now exposes referral v1 through one compact block: connected players can copy their personal `?ref=` link and see rewarded-referral progress (`X / 10`) without adding a separate referral screen or changing any fishing / cube / grill loops
- referral attach/payout has been verified against the accessible Supabase project used for rollout: the invited wallet is locked to the first valid referrer link, the inviter gets `+10` reserve bait on the first successful wallet connect, and repeat logins do not pay out twice
- the accessible Supabase rollout path currently relies on the live `verify-purchase` edge function for both coin purchases and NFT rod verification, so rod mint flow no longer depends on a separate `mint-nft-rod` endpoint
- bait shop pricing has been rebased to the new pace-control target (`5=400`, `10=800`, `25=2000`, `50=4000`), daily-task coin rewards and `+3` cube rolls remain unchanged, and the legacy bait-streak `claimDailyBonus` path is disabled behind the new bait-economy flags
- cube reward balance was trimmed down so it behaves like a bonus loop instead of the main rod-progression engine: the old `15k/20k` jackpots are gone, the regular coin table now tops out at `2.5k`, and the secret prize is `5k` instead of `20k`
- player economy audit logging is now wired into the accessible Supabase rollout: key gameplay actions write client-side audit events (`cast_started`, fish catch/sell, bait/rod purchases, task/cube/grill rewards), wallet/referral/purchase flows write server-side audit events, and both client + edge functions can be disabled with `VITE_PLAYER_AUDIT_LOGS_ENABLED` / `PLAYER_AUDIT_LOGS_ENABLED`
- the fishing HUD no longer shows the black MON purchase crystal on the main lake screen: coin/NFT buying now lives inside `Shop`, the `Travel` button was moved from the top overlay down near the bottom HUD, and `Tasks` now has a second `Special` tab with an `Earn 1000 gold` objective that pays `10 bait` without changing the existing daily-task cube flow
- the bottom arcade nav now surfaces pending content with small badges: `Tasks` shows how many task cards are still not claimed, and `Grill` shows how many recipes are currently cookable from the player's inventory
- the floating `Travel` shortcut now sits in the lower-right HUD lane instead of the old lower-left crystal slot, keeping the main fishing screen layout cleaner and more consistent with the remaining right-side action stack
- the lower-right `Travel` shortcut now matches the same shortcut size as the `Boost` and `Inventory` buttons, so the three action cutouts read as one consistent HUD set
- admin panel v2 now expands the existing `/admin` page instead of introducing a separate tool: admins get `Overview`, `Players`, and `Messages` tabs, a detailed per-player side sheet with economy/referral/grill/inventory summaries plus recent audit activity, quick grant buttons for coins/bait/daily bait, and a per-player in-game messaging flow
- player-facing inbox support is now added as a small additive layer: a new `player_messages` table plus `player-messages` edge function back a `Settings -> Inbox` block with unread count, message list, mark-as-read behavior, and toast notifications when new admin messages arrive
- verified admin wallets now get a red `Settings -> Admin Panel` shortcut that closes the settings dialog and opens the existing `/admin` page, making temporary live-admin testing possible without adding a new route or changing the admin auth model
- admin grant flow is now hardened for the current live Supabase schema: the `admin` edge function no longer searches or updates a missing `players.nickname` column, and the edit dialog only sends nickname updates when that field actually exists in the loaded player row
- verified wallet clients now merge server-side economy grants back into local player state instead of letting stale local saves mask admin-issued coin or bait updates in the HUD
- daily tasks v2 are now live: the ordinary set is `check_in`, `catch_10`, `rare_1`, `grill_1`, and `spend_1000`, the `Special` tab now only contains `Invite a friend`, and the cube unlocks after claiming any `3` ordinary daily tasks instead of requiring all `5`
- grill cooking now creates separate cooked-dish inventory items instead of only writing leaderboard score; dishes live in their own `Inventory -> Dishes` tab, use `recipe.score` as sell value, and can be sold later for gold without mixing into the fish inventory bucket
- wallet motivation and MON purchase presentation were tightened without changing auth or payments: welcome/settings now explain referrals + future MON rewards + cross-device progress more clearly, the shop explicitly presents `Buy gold with MON`, and the gem-like MON icon treatment was replaced with cleaner coin/utility iconography in the player-facing buy/boost/guide surfaces
- cube audio now has dedicated spin / reveal / reward SFX on top of the existing sound system, and background music now hard-mutes while the tab is hidden before resuming on visibility return for safer mobile behavior
- wallet-linked progress sync is now implemented in code: verified players serialize both `player` state and `gameProgress` through a dedicated `save-player-progress` edge function, keep `cooked_dishes` plus `game_progress` in the server player row, and restore cross-device inventory/dishes/tasks/cube/grill progress from server state instead of depending on empty local storage on a new device
- wallet progress sync is now rolled out on the working Supabase project `oyhyoqnhqifcwjyputif`: migration `20260420194500_add_cooked_dishes_to_players.sql` is applied remotely, `verify-wallet` and `save-player-progress` are deployed, and local `.env` now matches the same working project as GitHub Pages to avoid future cross-project drift
- live cross-device save was then hardened against schema drift on the working Supabase project: `players.nickname` is now added explicitly if missing, `save-player-progress` returns useful backend error details instead of a generic 500, and referral reward lookups in `verify-wallet` now fall back cleanly if nickname is unavailable during rollout
- MON economy foundation is now added on the working Supabase project `oyhyoqnhqifcwjyputif`: server-side `player_mon_rewards` and `mon_withdraw_requests` back a new `Settings -> MON Rewards` block with `1 MON` minimum withdraw and `7` day hold, `/admin` now has a `Withdrawals` queue with approve/reject/mark-paid actions, and admin wallets see a red pending-withdraw badge on the settings gear
- overnight reward hardening is now rolled out on the working Supabase project: new migration `20260421043000_add_reward_action_layer_and_hardening.sql` adds `player_cube_rolls`, `weekly_grill_payout_batches`, `social_task_verifications`, and `edge_rate_limits`, removes direct public grill leaderboard writes, and expands `player_mon_rewards` with admin/source metadata for future MON loops
- a shared server-side reward helper now exists in Supabase functions (`grantPlayerReward`) so `coins`, `bait`, and `mon` grants can go through one audited path instead of each endpoint hand-writing economy updates; admin MON grants and weekly grill payouts both use that helper
- a new `player-actions` edge function now owns the new reward-critical actions for verified wallets: daily task claim, cube roll selection, cube reward application, grill cooking, cooked-dish selling, and verified leaderboard name updates all go through backend state instead of relying on client-authored reward results
- the cube is now prepared for real MON rewards through a server-side prize config: the backend cube generator supports exactly `2` `MON` cells across the `150` total cube tiles, `1 MON` per hit, and returns authoritative roll faces/target/prize data for the client to display
- weekly grill payouts now have a backend preview/apply engine in `/admin`: the panel can preview current leaderboard payouts, apply a week once, store a payout batch in `weekly_grill_payout_batches`, and write MON reward lots tagged as `weekly_grill_top`
- reward-sensitive backend endpoints now have a first DB-backed throttle layer (`verify-wallet`, `save-player-progress`, `player-mon`, `admin`, and the new `player-actions` flow) and `save-player-progress` now rejects suspicious economy deltas instead of silently accepting large client-side jumps in coins, bait, catches, inventory, grill score, or paid cube rolls
- social tasks now have a scaffold instead of ad-hoc notes: shared `SOCIAL_TASKS` / registry config exists on the client and backend, `social_task_verifications` stores manual verification state, `/admin` has list/update actions plus a new `Social` tab for manual override, and future Twitter/Discord/Telegram tasks can be enabled without inventing a new state model
- overnight ops support is now added locally in-repo: `docs/ops-live-checks.md` documents the working project, live verification flows, and expected tables/functions, while `scripts/ops/` contains a session-token helper plus read-only and full-mutation smoke scripts for tomorrow's live checks
- the first live post-rollout bug in the new throttle layer is now fixed on the working Supabase project: `consume_rate_limit()` no longer fails on an ambiguous `window_started_at` reference, fresh `verify-wallet` sign-ins work again for new wallets, and the live mutation smoke now completes end-to-end against `admin`, `player-mon`, `player-actions`, weekly payout preview, and the withdraw flow without depending on `SESSION_TOKEN_SECRET`
- admin operations now have a first suspicious-activity dashboard without any new schema changes: `/admin -> Overview` surfaces flagged wallets from recent `player_audit_logs`, `edge_rate_limits`, and `mon_withdraw_requests`, the backend exposes `get_suspicious_summary` and `list_suspicious_players`, and both the read-only and mutation smoke scripts now cover that security-watch layer so tomorrow's checks do not require manual SQL digging
- player-facing social task scaffolding is now wired into the game instead of living only in admin tools: `Tasks` has a `Social` tab for verified wallets, submissions go through `player-actions`, admins can review them in `/admin -> Social`, and the live mutation smoke now covers submit -> verify -> claim end-to-end against the working Supabase project
- live ops tooling now has a broader read-only report path: `scripts/ops/live-ops-report.ps1` aggregates admin auth, withdraw summary, pending withdraw requests, weekly preview/batches, suspicious signals, and social verification queues into one JSON snapshot so tomorrow's checks can start from a single command instead of multiple manual edge calls
- the shared PowerShell edge invoker used by ops scripts is now compatible with the current Windows PowerShell runtime in this workspace: `scripts/ops/invoke-edge.ps1` no longer depends on `ConvertFrom-Json -AsHashtable`, so read-only reports and any helper call that passes JSON payload fields now work reliably instead of silently dropping filters/limits on older shells
- repo-local ops entry points are now easier to use tomorrow: `package.json` exposes `ops:session`, `ops:report`, `ops:smoke:readonly`, and `ops:smoke:mutation`, and `docs/morning-handoff.md` captures the shortest safe workflow back into live checks plus the next best product priorities that remain after the overnight reward/security pass
- the settings trigger now surfaces unread admin inbox mail more clearly: when a player has unread inbox messages, a small mail button with an unread badge appears next to the settings gear and opens the same settings/inbox dialog without adding a separate screen
- admin inbox messaging now supports full-player broadcasts without a schema change: `/admin -> Messages` can send one inbox message to every player row in the current database, the compose panel works even with no player selected, and personal + broadcast sending stay in the same message workflow instead of splitting into a separate tool
- admin refresh is now more resilient on cold loads: `useAdmin` can fall back to the stored wallet session address during direct `/admin` reloads, and `admin` edge calls now fail fast with a client timeout instead of leaving the page stuck forever on the initial admin-access check
