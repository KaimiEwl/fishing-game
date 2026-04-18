# STATUS

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
