# STATUS

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
