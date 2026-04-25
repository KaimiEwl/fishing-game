# STATUS

## Verified task claims now send the relevant task progress inside `claim_task_reward` itself instead of depending on a separate save race
- Fixed the remaining wallet-task regression where a task such as `rare_1` or `catch_10` could stay visibly `Ready`, the client could still attempt a sync, and the UI could still end on `Could not sync your latest task progress yet`.
- Root cause:
  - the previous fixes still depended on two separate requests lining up in time: first `save-player-progress`, then `player-actions claim_task_reward`
  - if the dedicated save request lagged, got queued behind other wallet saves, or simply had not been reflected in the wallet row yet, the follow-up claim still saw stale server progress and returned `Task is not ready to claim`
  - the UI then surfaced the generic sync toast even though the actual missing piece was just that the ready task progress had not reached the claim request in time
- Updated behavior:
  - verified task claims now send the relevant task-progress snapshot together with `claim_task_reward`
  - `player-actions` merges only the task-related maps (`tasks`, `specialTasks`, `weeklyMissions`) from that snapshot before checking readiness, instead of waiting for a separate full progress save to land first
  - the claim path still queues the background wallet save, but the reward itself no longer depends on winning a race against that separate sync request

## Verified task claims now retry against the server itself after saving progress, instead of false-failing on local wallet snapshot polling
- Fixed the case where a task such as `catch_10` could stay visually `Ready`, the button could switch to `Claiming...`, and the client still ended on `Could not sync your latest task progress yet` even though the live backend path `save-player-progress -> claim_task_reward` already worked.
- Root cause:
  - the previous retry path in `FishingGame` still depended on `savedGameProgressRef`, which is only a client-side mirror of the wallet row
  - that mirror could lag behind the actual server write and stay on the older task snapshot long enough for the client to abort the retry
  - the live API smoke confirmed the backend itself was already capable of saving `catch_10 = 10` and immediately granting the reward after that save
- Updated behavior:
  - verified task retry now queues `saveGameProgress(...)`, waits briefly for the save request to leave the client, and then retries `claim_task_reward` directly against the server
  - the retry loop now treats the server claim response as the source of truth instead of polling the local `savedGameProgress` mirror
  - this removes the false-negative sync gate that was blocking ready tasks from being claimed

## Verified task claims no longer wait for a full `game_progress` digest match before retrying the specific reward claim
- Fixed the wallet-task regression where a task could visibly stay `Ready`, the button could enter `Claiming...`, and the UI still ended up on `Could not sync your latest task progress yet` because some unrelated progress field in the wallet row was different.
- Root cause:
  - the retry path in `FishingGame` reused `flushGameProgressSave(...)`, which waits for the whole saved `game_progress` snapshot to match exactly
  - that is stricter than the actual requirement for reward claim, because the server can legitimately keep unrelated progress fields ahead of the local task snapshot
  - as a result, the specific task could already be ready server-side, but the client still aborted the retry because the full progress digest never became byte-for-byte identical
- Updated behavior:
  - verified task claim retry now waits only for the specific daily / special / weekly task to become ready in the saved wallet progress
  - the retry path still queues a `saveGameProgress(...)`, but it no longer blocks on unrelated `game_progress` drift before retrying `claim_task_reward`

## Fish HUD no longer swaps to text placeholders when cast or rod art loads slowly
- Fixed the fish-screen regression where the rod badge could degrade to a `STARTER` text box and the main cast / hook control could fall back to a plain text pill instead of the intended button art.
- Root cause:
  - `GameControls` and `RodPreviewBadge` were both explicitly switching to visible text-based fallback UIs on image `onError`
  - the active HUD images were still using relatively heavier PNGs, so any transient load/decode failure or timing hiccup pushed the UI into the placeholder path
  - the visible placeholder then made the issue look like a broken layout even though the real asset URLs themselves were valid
- Updated behavior:
  - the fish HUD now prefers optimized WebP art for the cast button, hook button, and rod previews, with PNG kept only as the hidden backup source
  - both components eagerly preload their primary and backup art and retry the real image chain instead of rendering a user-facing text placeholder
  - the visible `STARTER` / plain `CAST LINE` fallback panels were removed from the rod badge and fish action button flow

## Verified task claims no longer false-fail because client `game_progress` sync was comparing a looser local shape against the persisted server shape
- Fixed the wallet-task regression where `Claim reward` could hang on `Claiming...`, then show `Could not sync your latest task progress yet`, even though the save path itself had already been hardened.
- Root cause:
  - `flushGameProgressSave(...)` waits until the just-saved `game_progress` digest matches the server-confirmed digest
  - the client digest was only partially normalized and the actual `save-player-progress` request still sent the raw local snapshot
  - local snapshots can carry extra client-only fields and looser nested objects, while the server persists a stricter sanitized shape for `weeklyMissions`, `collectionBook`, `rodMastery`, `fishingNet`, and `wheelPrize`
  - that meant the save could succeed, but the client still treated it as unsynced and aborted the retry claim path
- Updated behavior:
  - `useWalletAuth` now canonicalizes `game_progress` to the persisted server-compatible shape before both digest comparison and `save-player-progress` submission
  - the sync check now compares like-for-like data instead of a raw local snapshot against a sanitized wallet row
  - verified task claims should stop failing with the false `latest task progress` sync error when the progress is already saveable

## First wallet link now immediately flushes merged guest task progress into the verified wallet
- Fixed the verified-task regression where a player could finish tasks as a guest, connect a wallet, still see those tasks as `Ready`, and then hit `Could not sync your latest task progress yet` on claim.
- Root cause:
  - the earlier guest -> wallet fix immediately flushed merged fish inventory into the wallet row
  - but the merged guest `game_progress` snapshot was still only local at first, so server-side `claim_task_reward` could legitimately say the task was not ready yet
  - the client retry path then depended on an on-demand sync instead of the progress already being attached to the wallet during first link
- Updated behavior:
  - the first verified wallet render in `link` mode now immediately flushes the merged local `game_progress` snapshot into `save-player-progress`
  - guest task progress, grill score, and other progress-state should now follow the player into the verified wallet instead of waiting for a later incidental save

## Fish action button fallback no longer collapses to zero height when the button art fails
- Fixed the desktop fish-screen bug where a player could cast, see `Fish on the line`, and then get only clipped `Hook fish` text with no usable button surface.
- Root cause:
  - the cast / hook control uses a PNG button plus a fallback state inside `GameControls`
  - when the button image failed to load, the inner wrapper had no intrinsic height of its own
  - that let the fallback button collapse vertically, so only the absolutely positioned label remained visible while the real click surface effectively disappeared
- Updated behavior:
  - the fish action control now keeps a fixed aspect ratio even when the art image fails
  - `Cast line` and `Hook fish` fallbacks stay as real visible buttons instead of collapsing to near-zero height
  - the broken-art path was rechecked in-browser by forcing image load errors for both the idle and biting button states

## First-time wallet linking now preserves guest fish and flushes it into the wallet before verified grill actions
- Fixed the guest -> wallet transition where a player could catch fish and even have enough ingredients for several grill dishes, then lose that effective inventory right after connecting a wallet.
- Root cause:
  - earlier verified-wallet hardening intentionally made `inventory` and `cookedDishes` server-authoritative
  - that solved stale-wallet grill mismatches, but it also meant the first verified snapshot dropped guest fish before the wallet row had ever saved it
  - verified grill then checked the wallet row, saw no fish yet, and failed with `Not enough fish to cook this dish`
- Updated behavior:
  - the first successful wallet verification now uses a one-time `link` merge mode that preserves guest fish and cooked dishes locally
  - that merged player snapshot is immediately flushed into `save-player-progress` after verification instead of waiting for later incidental saves
  - verified grill now also forces a player save flush before `cook_recipe`, so a player who connects a wallet and cooks right away does not race against an unsaved inventory snapshot

## Verified daily task claims were failing because `player-actions` responses were built from an out-of-scope helper
- Fixed the server-side regression where a newly connected wallet could see `Daily check-in` as ready but every verified task/action request returned a generic `Could not claim this task right now`.
- Root cause:
  - `supabase/functions/player-actions/index.ts` defined `jsonResponse(...)` and `badRequest(...)` at module scope
  - those helpers referenced `jsonHeaders`, but `jsonHeaders` only exists inside `serve(...)`
  - any path that tried to return through those helpers crashed with a `ReferenceError`, which the edge gateway surfaced as a plain `500 Internal Server Error`
- Updated behavior:
  - `jsonResponse` and `badRequest` now live inside the request handler, so they close over the real per-request headers
  - verified `Daily check-in` and other `player-actions` routes can return normal JSON responses again instead of crashing at the response layer

## Grill leaderboard no longer opens a second name prompt after cooking
- Removed the separate `Enter leaderboard name` flow so the game now has only one name-entry system: the required wallet-bound `Choose your name` dialog after wallet verification.
- Root cause:
  - grill score publishing still had its own `LeaderboardNameDialog` and pending-score state
  - after the first dish, guest and wallet flows could still branch into that second prompt instead of reusing the already saved player name
  - this created another save path, another modal blocker, and another source of name drift
- Updated behavior:
  - grill leaderboard entries now publish automatically with the existing player identity instead of opening a second naming modal
  - verified players use the saved wallet nickname
  - local guests fall back to their current local nickname or `Guest griller`
  - leaderboard screen copy no longer tells players to enter a second grill-specific name
  - the unused `LeaderboardNameDialog` component was removed from source so the second grill-only name path cannot reappear through a stale import

## Fishing HUD art now retries instead of getting stuck on broken rod/button placeholders after one image error
- Fixed the recurring fish-screen regression where the `Starter` preview could fall back to plain text and the cast/hook control could stay on a broken placeholder after a transient image load failure.
- Root cause:
  - the starter rod preview was not included in the warm HUD preload list
  - both `RodPreviewBadge` and `GameControls` latched their `onError` fallback states after a single image failure and mostly stayed there for the rest of the session
- Updated behavior:
  - all rod preview images, including `Starter`, are now part of the warm preload set
  - rod preview art and cast/hook button art now auto-retry after a short delay instead of staying permanently broken after one failed load
  - focus / tab return also triggers a fresh retry for those HUD images so transient asset failures can recover without a full reload

## Task claims no longer fail just because the post-claim audit insert fails
- Fixed the deeper server-side case where a task reward could already be granted in `players`, but the request still returned as failed to the client.
- Root cause:
  - daily, weekly, and special task claims updated the player first and then treated `insertPlayerAuditLog(...)` as a critical step
  - if that audit insert failed, the function returned an error even though the reward and claimed state had already been written
- Updated behavior:
  - task claim audit writes now run as non-critical best-effort steps, like the hardened `Grill` flow
  - verified task claims can complete successfully even if the trailing audit insert fails

## Task claims now show an active pending state and retry once after verified progress sync
- Fixed the case where `Claim reward` on the `Tasks` screen could feel dead or fail on the first verified attempt with no visible feedback.
- Root cause:
  - verified task claims always tried to flush wallet progress first, which could make the button feel unresponsive while save state settled
  - normal daily/special claims had no explicit success toast or `Claiming...` state, so even successful clicks could look like nothing happened
- Updated behavior:
  - daily, blockchain, and weekly task buttons now show `Claiming...` while a claim is in flight
  - verified task claims now try the server claim first and only force a progress sync/retry when the server says the task is not ready yet
  - successful daily/special claims now show a success toast
  - the tasks badge now counts only actually claimable rewards instead of every unclaimed task

## Fish action button now renders above the bottom nav instead of sharing its stack level
- Fixed the desktop case where `Cast line` returned after a cast cycle but only a clipped top slice remained visible.
- Root cause:
  - `GameControls` and `BottomNav` were still sharing adjacent overlay space after the previous button hardening passes
  - on desktop the restored cast button could sit low enough to get visually cut by the nav strip, even when the button state itself had correctly returned to idle
- Updated behavior:
  - the fish action button stack now renders on a higher layer than the bottom nav
  - the desktop control also sits slightly higher above the nav strip so the full button surface returns after cast/result cycles

## Legacy verified wallets with an existing name no longer get forced through the one-time name prompt again
- Fixed the migration gap for the small set of older wallet accounts that already had a custom identity but no `players.nickname`.
- Root cause:
  - the mandatory `Choose your name` dialog is intentionally gated only by `savedPlayer.nickname`
  - some older verified wallets still had a custom `grill_leaderboard` name while their `players.nickname` field stayed empty
  - `verify-wallet` returned that empty wallet row as-is, so the client treated them like brand-new nameless wallets and reopened the required prompt
- Updated behavior:
  - `verify-wallet` now backfills `players.nickname` from an existing custom `grill_leaderboard` wallet row before returning the verified player snapshot
  - older named wallet accounts stop seeing the forced prompt again
  - truly new verified wallets with no saved wallet-bound name still get the one-time required prompt after wallet verification

## Fish action button no longer stacks fallback layers on top of the real cast/hook art
- Cleaned up the desktop/mobile fishing CTA after the previous hardening pass added too many visible fallback layers.
- Root cause:
  - the styled fallback pill was still rendering under the real button art even when the PNG loaded correctly
  - the biting state also forced an extra `Hook fish` text overlay on top of the green art, creating duplicate text and a fake second surface
- Updated behavior:
  - the glow/fallback pill now appears only when the button image itself actually fails to load
  - the inline `Hook fish` label now appears only in true fallback mode instead of sitting on top of the normal button art

## Fish action button fallback now tracks blue and green art separately
- Fixed the follow-up regression where a cast could return to an idle `Cast line` placeholder instead of the real button art.
- Root cause:
  - the button was keeping one shared `art failed` flag for both the blue cast button and the green hook button
  - if one state tripped the fallback path, the next state could inherit that failure and stay stuck on the placeholder surface
- Updated behavior:
  - blue and green button assets now track failure independently
  - switching back from `Hook fish` to `Cast line` no longer revives the fallback UI unless that specific image actually failed

## Fish action button now sits above the bottom nav instead of sharing its layer
- Fixed the follow-up case where only the top of `Cast line` stayed visible after a few fishing cycles.
- Root cause:
  - `GameControls` and `BottomNav` were both rendered at `z-30`
  - the bottom nav is mounted later in the tree, so it could cover most of the fish action button and leave only the top slice visible
- Updated behavior:
  - the cast/hook button stack now renders above the bottom nav layer, so the full button remains visible and clickable after cast/result cycles

## Wallet daily check-in is locked to one claim per day again
- Disabled the old repeat-test mode that still let the blockchain daily check-in act like a reusable bait faucet.
- Fixed three layers of the same bug:
  - the wallet check-in send button is now disabled once today's check-in is already recorded
  - local wallet check-in sync no longer flips the special task back to `claimed: false` just because another same-day tx hash appears
  - the local fallback claim path still works for client-verified check-ins, but it no longer advertises or supports repeat same-day claiming
- Resulting behavior:
  - `Daily check-in` can be completed and claimed once per day
  - same-day repeat MON sends no longer reopen the bait reward

## Verified grill now trusts the wallet inventory instead of stale local fish stacks
- Fixed the remaining split-brain behind `Grill` showing enough fish and then failing with `Not enough fish to cook this dish`.
- Root cause:
  - the verified wallet snapshot was still merging `inventory` and `cookedDishes` with old local browser state
  - `Grill` could therefore render fish counts from stale local storage instead of the actual wallet row
  - the client was also trying to pre-flush local `player.inventory` before cook, which kept the mismatch path alive instead of enforcing one source of truth
- Updated behavior:
  - verified wallet snapshots now keep server-authoritative `inventory` and `cookedDishes`
  - verified `Grill` cook checks only the wallet snapshot before sending `cook_recipe`
  - if wallet inventory is still catching up, the client now says that directly instead of pretending the recipe should already cook

## Verified daily task claims no longer block on unrelated wallet save queue work
- Fixed the `Could not sync your latest task progress yet. Try again in a second.` error that could still appear on ready verified tasks like `Daily check-in`.
- Root cause:
  - task claim was waiting for `flushGameProgressSave(...)` to see the exact `game_progress` digest saved
  - but the client also required the entire wallet save queue to be empty before it returned `true`
  - unrelated queued player/profile saves could keep that queue non-empty even after the needed task progress had already been persisted
- Updated behavior:
  - verified task claims now proceed as soon as the required `game_progress` digest itself is saved
  - unrelated queued wallet saves no longer block `Daily check-in` and other ready task claims

## Fishing HUD no longer loses the starter rod icon or main cast/hook control when art fails
- Hardened the main fish HUD against asset-level failures instead of assuming the rod/button PNGs always load.
- Root cause:
  - the rod preview badge and cast/hook control depended directly on image assets with no UI fallback
  - if a rod or button image failed to load or came from a stale cache path, the player could see a broken `Starter` badge and an apparently missing main action button
- Updated behavior:
  - the rod badge now retries a safe fallback rod image and finally falls back to a text badge instead of a broken image box
  - the main cast/hook control now has a built-in styled button fallback, so `Cast line` / `Hook fish` remains visible even if the button art fails
  - the control stack is also nudged higher above the bottom HUD to reduce the chance of it slipping off-screen on mobile

## Saving a verified wallet name no longer throws a scary grill leaderboard error after success
- The wallet name save itself is now treated as the primary action, and the grill leaderboard rename is treated as a background sync instead of a second user-facing failure point.
- Root cause:
  - after a successful `Choose your name` save, the client immediately tried a separate `update_grill_leaderboard` call
  - if that non-critical follow-up failed, players still saw a red toast even though the wallet name had already been persisted
- Hardened behavior:
  - `save-player-name` now also updates the existing verified grill leaderboard row name server-side when that row already exists
  - the frontend verified name-sync path falls back to a quiet direct leaderboard save instead of showing a red toast after a successful name save
- Resulting behavior:
  - players should stop seeing `Could not update the grill leaderboard right now` immediately after a successful wallet-name save
  - verified leaderboard aliases should still converge to the saved wallet name without treating that background sync as a blocker

## Edge Functions now allow both live Hook & Loot domains instead of only the old GitHub Pages origin
- Found the missing server-side half of the wallet-name save failure on production:
  - direct Supabase Function responses were still sending `Access-Control-Allow-Origin: https://kaimiewl.github.io`
  - that means browser calls from `https://hookloot.xyz` and `https://www.hookloot.xyz` could still fail even when the function logic itself was correct
- Added a shared Edge Function CORS helper and updated the main live gameplay endpoints to reflect allowed live origins:
  - `hookloot.xyz`
  - `www.hookloot.xyz`
  - existing local dev origins
  - legacy GitHub Pages origin
- Hardened endpoints:
  - `verify-wallet`
  - `save-player-name`
  - `save-player-progress`
  - `player-actions`
  - `player-messages`
  - `player-mon`
  - `verify-purchase`
  - `mint-nft-rod`
  - `log-player-event`
- Resulting behavior:
  - wallet verification and wallet-name save no longer rely on a stale GitHub Pages CORS config
  - bare-domain `hookloot.xyz` and `www.hookloot.xyz` are both valid browser origins for the updated functions

## Bare-domain edge proxy fallback no longer breaks verified wallet name saves
- Fixed a production-only edge-call trap behind repeated `Could not save wallet name right now` errors.
- Root cause:
  - the app was allowing same-origin edge proxy calls on both `www.hookloot.xyz` and bare `hookloot.xyz`
  - the bare domain proxy path redirects edge POST requests to `www`
  - after that redirect, the authorization header can be dropped before the request reaches Supabase Functions
  - wallet-name saves then fail before `save-player-name` even runs
- Client edge invocation is now hardened in two ways:
  - same-origin proxy is used only on `www.hookloot.xyz`
  - if the proxy still answers with `UNAUTHORIZED_NO_AUTH_HEADER`, the client automatically retries the function against the direct Supabase Functions URL
- Resulting behavior:
  - verified name saves no longer depend on the fragile bare-domain redirect path
  - wallet verification and other edge-backed actions also get the same fallback protection

## Verified wallet refresh now always returns the full player row, including nickname
- Fixed the name-loss regression that could still happen after `Ctrl+F5`, wallet-session restore, or background verified-session refresh.
- The underlying bug was on the server refresh path:
  - the client now correctly treats `savedPlayer.nickname` as the only source of truth
  - but `verify-wallet` was not guaranteeing a fresh full `players` row on every verified refresh cycle
  - that meant a later session refresh could overwrite the client with a player payload that effectively came back without the wallet nickname
- `verify-wallet` now fetches the processed wallet player from `players` after login/session side effects and returns that full row back to the client, including `nickname` and the rest of the wallet-bound state.
- Resulting behavior:
  - saving a verified wallet name should survive `Ctrl+F5`
  - `Wallet`, `Settings`, and other verified-name UI now prefer the wallet snapshot name for display instead of a potentially stale local nickname layer
  - `Settings` should keep showing the same wallet-bound name after refresh
  - the blocking `Choose your name` prompt should not reopen for the same wallet once that nickname is actually persisted

## Verified wallets now have exactly one required name-entry flow
- Removed the extra wallet/settings rename entry points so the game no longer offers multiple competing ways to set the player name.
- The only remaining name-entry UI for a verified wallet is the blocking `Choose your name` dialog that appears after wallet verification when that wallet still has no saved nickname.
- Current rule:
  - no wallet or wallet not verified => no forced name prompt
  - wallet verified and wallet nickname missing => one blocking name dialog opens
  - wallet verified and wallet nickname already saved => no prompt and no duplicate editor
- `Wallet` and `Settings` now show the current wallet-bound name as read-only status instead of acting like second rename forms.
- The prompt gate now trusts only the verified wallet snapshot for nickname existence. The earlier local fallback cache was removed so the client can no longer silently treat a device-local cached name as equivalent to a saved wallet name.
- The blocking name dialog also no longer exposes the standard close/escape path, so a verified wallet cannot continue without saving a name.

## Verified wallet names now save through a dedicated server-confirmed rename path
- Fixed the remaining rename regression behind `Settings -> Player name` and the repeated post-refresh name prompt.
- The old flow was still fragile because wallet-bound name saves were piggybacking on the same full-player autosave queue as inventory/progress:
  - rename success depended on a later snapshot round-trip
  - queued wallet saves could delay or muddy that confirmation
  - the UI could treat the rename as unsaved even when the intent was correct
- Verified name saves now use a dedicated server-confirmed `save-player-progress` rename path:
  - the rename no longer depends on the generic autosave queue to be considered successful
  - queued player autosaves are patched to keep the new nickname instead of reviving the old one after the rename
  - the returned wallet player row is applied as a server-authoritative snapshot
  - the client only accepts the rename after the server response itself confirms the saved nickname
- Resulting behavior:
  - `Settings`, `Wallet`, and the blocking `Choose your name` dialog all rely on the same hardened save path
  - wallet-bound names no longer depend on the general autosave queue to stick
  - the rename UI no longer flips optimistically into a fake-saved gray state before the verified wallet response arrives
  - refreshes should keep the saved verified nickname instead of reopening the name prompt for the same wallet

## Manat Shop cube rolls and MON rods now use premium pricing, stronger buffs, and separate shop art
- Raised Manat cube-roll pricing from cheap impulse amounts to `1 / 3 / 5 MON` for the `1 / 3 / 5` roll packs.
- Raised MON rod-unlock pricing to `3 / 5 / 10 / 25 MON` so those shortcut purchases are no longer near-free compared with their impact.
- Reworked the bonus MON rod lineup to feel distinct from the coin rods:
  - separate rod art in the shop instead of reusing the exact same base-rod icons
  - stronger rarity / XP / sell-price buffs
  - premium prices scaled up to `1 / 3 / 5 / 10 / 25 MON`
- Synced the rod tooltip badge with the same upgraded MON rod stats so the HUD no longer shows stale pre-buff numbers.

## Verified grill cooking no longer fails the whole request after fish were already consumed
- Hardened the wallet-backed `cook_recipe` flow against non-critical post-cook failures.
- The dangerous sequence had been:
  - fish inventory updated successfully
  - cooked dish created successfully
  - then a later leaderboard or audit-log step could still throw
  - the player saw a failed cook even though the wallet inventory had already changed
- `cook_recipe` now treats leaderboard sync and audit logging as best-effort follow-up steps instead of hard blockers for the dish itself.
- `sell_cooked_dish` audit logging was hardened the same way so the sell path does not risk the same partial-success behavior.

## Settings and wallet name saves now use the same verified wallet-sync path, and the hook button sits higher above the bottom HUD
- Fixed a split name-save flow where `Settings` and the wallet popup were still using the local-only `setNickname` path instead of the verified wallet-bound save handler.
- All player-name entry points now go through the same async wallet sync confirmation:
  - `Choose your name`
  - `Wallet`
  - `Settings`
- The UI no longer treats a rename as saved until the verified wallet snapshot reflects the new nickname. If that sync is not confirmed, the rename is rolled back and the player sees an explicit save error instead of a fake-success state.
- Raised the main fishing button stack higher above the bottom navigation and added an explicit `Hook fish` overlay during the bite state so the reel action is visible instead of disappearing under the HUD/art on smaller screens.

## Settings wallet-name saves now overwrite the old nickname instead of reviving it from the server
- Fixed the wallet-name persistence bug behind renamed players in Settings.
- The server-side save path had still been preferring the old persisted `players.nickname` over a newly requested wallet name, so a rename could appear to save on the client and then snap back after refresh.
- The save rule is now the intended one:
  - non-empty new wallet nickname wins
  - blank nickname does not erase the stored one
  - unchanged nickname remains untouched
- Added an explicit verified-wallet name editor in `Settings`, so the rename flow now goes through the same wallet-bound save path instead of depending on the one-time setup dialog.

## Verified grill now renders from the wallet snapshot instead of stale local fish stacks
- Fixed another wallet-backed grill drift where the board could still show recipe ingredient counts from a stale optimistic local player layer even after the server had already consumed fish for a cooked dish.
- The grill viewport and grill badge now read from the verified wallet snapshot when available, so recipe availability tracks what is actually saved for that wallet instead of whichever local inventory copy happened to be larger.
- Hardened `save-player-progress` client handling as well: when a wallet save response comes back and there is no newer queued player snapshot waiting behind it, the returned player row is now applied as a server-authoritative snapshot instead of being re-merged with local state again.
- Resulting behavior:
  - after cooking on a verified wallet, the grill board should stop pretending the old fish are still there
  - follow-up recipe availability should reflect the wallet/base snapshot much more closely
  - normal rapid local progress still keeps optimistic behavior only when a newer queued player save actually exists

## Wallet name prompt now waits for the verified wallet snapshot and does not reopen during name sync
- Fixed a wallet-name dialog regression where the game could still ask for a name on app entry even after that verified wallet had already saved one before.
- The root problem was that the prompt gate was looking at the live local `player.nickname` layer instead of the resolved wallet snapshot, while the wallet-bound name save path could still be in flight.
- The wallet name requirement now uses the verified saved player snapshot as the authoritative source:
  - no wallet snapshot yet => do not prompt
  - verified wallet snapshot already has a nickname => do not prompt
  - verified wallet snapshot is loaded and still has no nickname => prompt once
- Saving the wallet-bound name now also waits for the explicit wallet-profile flush path before the flow is considered done, so the dialog no longer reopens in the middle of that save cycle.
- Hardened the wallet-name save path against broken blank values in `players.nickname`, so an empty server value no longer blocks the first real wallet name from being persisted.
- Added a wallet-address-scoped local fallback cache for the saved name on the current device, so the same verified wallet no longer gets the name prompt again on refresh or tab changes while the authoritative wallet snapshot catches up.

## Non-fishing tabs now have a recovery path instead of falling into a blank black screen
- Fixed a screen-switch failure mode where moving from `Fish` into a lazy-loaded screen like `Shop` or `Tasks` could leave the game looking like a dead black screen.
- The underlying problem was that those tabs are lazy-loaded, but there was no error boundary around the non-fishing tab area:
  - chunk-load mismatch after a fresh deploy
  - or a runtime crash inside a tab screen
  - could bubble out into an effectively blank dark container
- The non-fishing screen area now has a local recovery boundary:
  - recoverable lazy-chunk load errors auto-reload the app once
  - persistent failures show an explicit recovery panel instead of a silent black screen
  - the player can reload the game or jump back to `Fish`

## Verified grill cooking now retries the wallet inventory snapshot before rejecting a recipe
- Fixed a verified grill race where the UI could already show enough fish for a recipe, but the server-side `cook_recipe` action still read an older `players.inventory` row and rejected the cook with `Not enough fish to cook this dish`.
- The cook path now retries the authoritative wallet inventory read a few times before failing, so a just-synced catch has time to land in the player row before the grill recipe is validated.

## Verified wallet names now override stale grill leaderboard aliases
- Fixed a wallet identity drift where the player profile nickname and the grill leaderboard name could diverge for the same verified wallet.
- The bad state looked like this:
  - wallet/player profile already had the new canonical name
  - leaderboard row still kept an older guest or custom grill alias
  - refreshing the board could keep reviving that stale alias instead of the wallet name
- The canonical rule is now enforced in all three places that were fighting each other:
  - frontend wallet merge into leaderboard entries now prefers the verified wallet nickname over an old guest name
  - verified players no longer get a separate leaderboard-name prompt once they already have a wallet-bound name
  - server `player-actions` now writes the current wallet nickname back into `grill_leaderboard` instead of preserving an older row name
- Resulting behavior:
  - a verified player should show one consistent name across profile and leaderboard
  - changing the wallet-bound player name should also rename that player's leaderboard row instead of leaving the old alias behind
  - existing stale rows are now eligible to self-heal the next time the verified session syncs leaderboard state

## Verified daily task claims now use the same UTC day boundary as the server
- Fixed a day-boundary mismatch behind verified daily tasks like `Catch 1 rare fish`.
- The client-side quest board was tracking daily task progress using the browser's local calendar day, while the verified server claim path normalized daily progress against the server day.
- That mismatch could produce the exact bad state seen in production:
  - the card showed `1/1 Ready`
  - `Claim reward` stayed enabled
  - `claim_task_reward` still rejected the task as not ready on the server
- Daily and weekly progress keys are now aligned to UTC across:
  - frontend `useGameProgress`
  - shared server `gameProgress` helpers
  - `save-player-progress`
  - `player-actions` daily claim normalization
- Resulting behavior:
  - the quest board and verified claim endpoint now evaluate the same day window
  - rare-fish daily claims should no longer drift into a fake-ready state because of local-vs-server date differences

## Daily and weekly task claims now resolve from a deterministic progress snapshot
- Fixed a claim-flow bug in the local `useGameProgress` reward engine where daily and weekly quest claims were reporting success through mutable flags set from inside `setState`.
- That pattern could leave the UI in a bad in-between state for ready tasks like `Catch 1 rare fish`:
  - the card looked claimable
  - the click path depended on a side effect from React's update queue
  - the reward action could bail out even though the quest was already complete
- Task and weekly-mission claims now compute their full transition from the current progress snapshot first, then apply the new snapshot and rewards from that deterministic result.
- Resulting behavior:
  - a completed local task should claim immediately instead of depending on React update timing
  - the same deterministic path now also covers local weekly mission claims

## Hook button now stays visible while the bite meter floats above it
- Fixed a fish-screen layout regression where the `Hook fish` control could slip below the visible bottom edge on some screens once the bite meter appeared.
- The root cause was the control stack itself:
  - bite meter and main cast/hook button were sharing the same vertical flow
  - when the meter appeared, it pushed the button down instead of hovering above it
- The bite meter now renders as a floating overlay above the primary control, so the hook button keeps the same bottom anchor in both idle and biting states.
- Added a visible button label on top of the cast/hook art as a second safety layer, so the action stays readable even if the image art is hard to parse at a glance.

## Premium expedition casts now have a real perfect-timing window
- Premium fishing already supported `miss / good / perfect` on the backend, but the client reel action was still effectively binary:
  - timeout => `miss`
  - any manual tap => `good`
- The premium bite meter now exposes a visible sweet spot on the reaction bar, so players can actually aim for a stronger cast quality instead of guessing.
- Manual premium reel timing now resolves as:
  - `perfect` when the remaining bite bar lands inside the marked center window
  - `good` for any other in-time manual tap
  - `miss` on timeout as before
- This change does not alter the normal fishing reel path and does not require a backend schema change; it only makes the already-supported premium reaction quality reachable from the UI.

## Verified task claims now flush quest progress before server reward claim
- Fixed a wallet-backed quest regression where the `Tasks` screen could show a daily or weekly quest as ready, but the server still rejected the claim because the latest `game_progress` snapshot had not finished saving yet.
- The root cause was different from inventory-backed actions:
  - fish / coins / dishes save through the player snapshot
  - quest progress saves through the separate `game_progress` channel
  - verified claim actions were calling `claim_task_reward` immediately without waiting for that `game_progress` save queue to settle
- Verified daily-task and weekly-mission claims now explicitly flush the latest quest-progress snapshot before calling the server reward action.
- Resulting behavior:
  - if a quest card says `Ready`, claim now waits for the wallet sync instead of racing it
  - the server should no longer bounce valid claims with `Task is not ready to claim` just because the local task update was still in flight

## Verified bait/cook sync no longer resurrects free bait or races grill saves
- Fixed a verified-player sync regression where the client merge layer could revive the current-day free bait bucket back toward `30` after wallet refresh/save because it was merging `dailyFreeBait` by maximum instead of by remaining same-day amount.
- Daily free bait now merges by reset day and same-day minimum, so spending casts no longer gets undone by a later wallet snapshot on that same UTC day.
- Fixed a second verified grill issue in the wallet save queue:
  - `sync before cook` used to call `saveProgress(player)` and treat a queued save as already finished
  - that meant `cook_recipe` could run against an older server inventory row while the real catch save was still in flight
  - the result was intermittent grill failure even though the local recipe card looked ready
- Grill cook now waits for the exact player digest to finish saving before the server cook request is sent.
- After successful verified `cook/sell dish` responses, the player snapshot is now applied in a server-authoritative mode so consumed fish / cooked dishes do not immediately pop back from the previous local state.

## Grill score now has an explicit info explainer for future token-share context
- Added a small `i` info button next to grill score UI so players do not have to guess what the points are meant to represent later.
- The explainer now states the intended direction in a non-promissory way:
  - if the game token launches later
  - any grill-based allocation would be proportional to score share
  - `your grill score / total grill score`
  - more score means a larger share for that account in that model
- The copy also explicitly says this is informational only and not a promise of token launch, allocation, or payout.

## Manat Shop tab clarified and fishing nets expanded into 3 MON tiers
- The shop already had a third MON purchase tab in code, but it did not stand out enough and the old single-net presentation still looked like the earlier one-off experiment.
- The premium tab is now framed more aggressively and player-facing copy reads `Manat Shop`, so the `Bait / Rods / Manat Shop` split is much easier to notice.
- Fishing nets are now a proper tiered MON product line instead of one fixed utility:
  - `Scout Net` = `10 fish/day` for `3 MON`
  - `Harbor Net` = `25 fish/day` for `30 MON`
  - `Fleet Net` = `50 fish/day` for `60 MON`
- Net ownership now stores the active daily fish capacity in progress state and wallet-save merges, so upgrades do not collapse back to the old `10 fish` default after sync.
- Existing legacy nets still load safely and default to the old `10 fish/day` tier if they were purchased before this change.

## Social task placeholder noise removed from the Quest Board
- The `Social` tab is still intentionally preview-only, but the game was still auto-refreshing social-task status from the backend whenever a verified player opened `Tasks`.
- That background request could surface a confusing technical toast about temporary social-task availability even though the UI itself was not offering a live social-quest flow yet.
- The preview tab now stays fully local for normal navigation:
  - opening `Tasks` no longer triggers the background social-task refresh call
  - social cards now read as `Preview` instead of a broken half-live action
  - the button copy now clearly says preview-only instead of implying the player can already open/complete a live social task

## Monad net icon updated and verified grill cook now syncs inventory before server cook
- The Monad Shop net card now uses the new downloaded net art instead of the temporary SVG glyph, so the fishing net reads as its own premium utility item in the shop.
- Fixed the confusing grill failure path for verified wallet players:
  - the client was showing local fish counts immediately after catches
  - but `cook_recipe` is server-authoritative and could still read an older saved inventory row
  - now the client flushes the latest player inventory to the wallet save first, waits for that synced snapshot, and only then sends the cook action
- Fixed a second grill-related debugging issue at the same time: `usePlayerActions` no longer swallows the real server error payload behind the generic fallback toast, so if the backend rejects a future cook/sell action the player now sees the actual server reason.
- Removed the extra client-side duplicate grill progress bump after verified server cook/sell responses, so grill score and weekly sell/cook mission state no longer risk drifting upward twice on the client.

## Wallet-linked players now must save a name after verification
- The game no longer forces a player-name prompt on first entry before any wallet is connected. That old flow created cross-device confusion because the name could exist only in one browser before a wallet was ever bound.
- The mandatory name checkpoint now happens at the wallet-bound moment instead:
  - wallet connected + verified
  - wallet profile still has no saved nickname
  - the blocking `Choose your name` dialog opens and must be completed
- Wallet restore is now stricter about identity:
  - once a verified wallet snapshot is loaded, the nickname is taken only from the wallet row
  - an old local browser nickname no longer hides a missing wallet nickname
- Resulting behavior:
  - first visit without wallet: no forced name prompt
  - same wallet on another device with an existing saved nickname: no extra prompt
  - same wallet on another device with no saved nickname yet: prompt appears again until that wallet-bound name is saved

## Daily wallet toasts shortened and Shop reworked into Bait / Rods / Monad Shop
- The wallet daily MON check-in flow no longer stacks multiple unrelated top toasts as long-lived separate popups:
  - the `transaction sent -> verifying -> updated` path now reuses one toast id and replaces the message in place
  - the active daily wallet check-in toasts now auto-close on a tighter `~5.6s` timing instead of lingering as a longer stack
- `Shop` was reorganized into three tabs:
  - `Bait`
  - `Rods`
  - `Monad Shop`
- `Auto Fishing Net` was removed from the coin bait tab and moved into `Monad Shop`.
- The old fish placeholder icon for the net was replaced with a dedicated net glyph, so the utility now reads as a separate net item instead of another fish card.
- `Monad Shop` now groups the wallet-purchase layer in one place:
  - `Auto Fishing Net` one-time MON purchase at `0.2 MON`
  - cube roll MON packs:
    - `1 roll = 0.04 MON`
    - `3 rolls = 0.1 MON`
    - `5 rolls = 0.16 MON`
  - direct MON rod unlocks still exist there as the instant-unlock layer
  - the stronger bonus MON rods now surface inline there as NFT rod cards with the existing rarity / XP / sell-price bonuses
- The old quick gold purchase path was kept, but it now lives under `Monad Shop` as the fallback `Gold packs` action instead of sitting in the bait tab.
- `Wheel` roll buying was aligned to the same cheaper base MON price and now also uses the shorter replace-in-place toast flow.

## Menu smoke harness added for desktop/mobile screen checks
- Added a repo-local QA harness for repeatable menu regression sweeps without bringing in a new test framework:
  - `public/qa-runner.html` drives the live app in-browser and records per-screen status
  - `scripts/qa/run-menu-smoke.mjs` runs a desktop + mobile smoke pass through the current key menus/dialogs using system Chrome headless
- The current smoke output is saved under `tmp/menu-smoke/`:
  - `report.json` for structured results
  - `screenshots/` for per-screen captures
  - `findings.md` for the short human review summary
- Current automated pass opens all targeted menu states successfully in the local headless sweep:
  - fish
  - tasks
  - shop
  - grill
  - cube
  - board
  - map
  - info
  - wallet
  - settings
  - inventory
  - boost
- Manual screenshot review from the same run also flagged one follow-up item to confirm later: some mobile overlay captures (`Settings`, `Wallet`, `Inventory`, `Boost`, `Fish info`) appear shifted right in the headless environment, but this still needs confirmation in a real browser before treating it as an app bug.

## Passive fishing net added as a daily shop utility
- Added a new permanent `Auto Fishing Net` utility item to `Shop -> Bait`.
- It is a one-time coin purchase priced at `6000 coins`, chosen to land around a `~14 day` payback at the current average fish-table value while still feeling attractive as a passive convenience purchase.
- Once bought, the net can fill with `10 random fish` at a time:
  - first purchase fills it immediately for a good first-use experience
  - after collection, it refills once per new daily cycle
  - it does **not** bypass the core loop by granting XP or daily catch-task progress; it is inventory value and cooking fuel, not a full gameplay replacement
- Net ownership and ready/full state live in `gameProgress`, so they now round-trip through the existing wallet save sync instead of being trapped in one browser.
- The main game now surfaces a toast when the net becomes full, and `Shop` shows both the idle description and the current ready-to-collect state.

## Audio settings split into separate music and sound toggles
- `Settings` no longer treats all audio as one global mute switch. It now exposes two independent persisted toggles:
  - sound effects on/off
  - music on/off
- Both are enabled by default for new players, and both remember the player's last choice through local storage.
- The old background-music hook had been wired to the same `sound_muted` key/event used by SFX. It now listens to its own `music_muted` state, so turning off music no longer kills cast/catch/grill sounds, and turning off sounds no longer forces the music loop off.

## Daily check-in server drift fixed and MON rod purchases added
- Found a real verified-player regression in the daily task claim path: the client always treats `Daily check-in` as immediately ready for the current day, but the backend shared `game_progress` defaults still seeded `check_in` with `progress: 0`. That made wallet-backed players see a ready card in the UI and then get a backend reject on `claim_task_reward`.
- The shared backend `gameProgress` sanitizer/default layer now force-seeds `check_in` to `progress: 1` whenever the task is not already claimed, so old rows and fresh rows self-heal instead of depending on a manual seeded save.
- `Shop` safe-area was also pushed lower so the `Bait / Rods` header no longer rides so high under the desktop/mobile browser chrome.
- Added a new direct MON rod purchase path as a convenience layer separate from NFT minting:
  - Bamboo: `0.05 MON`
  - Carbon: `0.15 MON`
  - Pro: `0.4 MON`
  - Legendary: `0.9 MON`
- These prices were chosen to stay well below the absurd pure coin-conversion equivalent while still preserving NFT mint value on top. In practice they function as time-skip unlocks, not as a replacement for NFT rods.
- The existing `verify-purchase` function now supports `rod_purchase_level` as a separate purchase kind from `rod_level` NFT minting, and the client MON market dialog now exposes a dedicated `Rods` tab for those direct purchases.

## Grill cook path fixed after client/server recipe drift
- Found a real live regression in the grill flow: the frontend recipe table had already moved `Deepwater Platter` to the safer `catfish x2 + bream x1` recipe, but `supabase/functions/_shared/grillConfig.ts` still used the old `pike + catfish` ingredients.
- Because `player-actions -> cook_recipe` trusts the server-side grill config, the live cook flow could reject a valid client-side recipe and surface the generic cook failure path.
- The backend grill config is now aligned with the frontend recipe table again, so `cook_recipe` uses the same `Deepwater Platter` ingredient set as the UI.

## Share preview and in-game toast layer cleaned up
- The site share preview metadata no longer points at the old external Lovable image. `index.html` now uses the new local `social_preview_hookloot.jpg` art built from the latest image in `Downloads`, with absolute `https://www.hookloot.xyz/...` Open Graph and Twitter image URLs.
- The old placeholder share copy was removed:
  - `Lovable Generated Project` is gone from `description`, `og:description`, and `twitter:description`
  - author metadata now points to Hook & Loot instead of Lovable
- Referral links now append a static preview version query (`preview=2`) so newly copied invite links use a fresh URL shape instead of reusing the old cached messenger preview for the original `?ref=...` link format.
- The album/feedback popups were still inheriting a system/light Sonner look, which made some first-catch notifications appear as plain white default toasts against the dark game UI.
- The active Sonner layer is now forced to the dark game theme and anchored at the top center, so cast/album/status popups no longer sit over the lower fishing controls.
- Album first-catch rewards still use the lightweight toast path, but they now go through the single themed toast layer instead of producing the old white duplicate popup.

## Grill desktop alignment and background music refreshed
- `Grill` desktop cards were nudged slightly lower inside the painted board safe-area so the recipe blocks no longer sit as high against the top wood trim as before. Mobile grill layout was left unchanged in this pass because it was already behaving acceptably.
- The old procedural WebAudio background loop was removed. The game now uses a real looping music track loaded from `public/assets/audio/bg_gone_fishin.mp3`, which replaced the synthetic “bleepy” tone generator.
- The new music track is the free-use `Gone Fishin'` track from OpenGameArt, compressed down to a web-friendly `128 kbps` MP3 for production playback.
- Music still follows the existing global sound mute flag and mobile unlock flow:
  - first user interaction unlocks playback
  - hidden tabs pause the track
  - visible tabs resume it if sound is enabled

## Player name is now treated as a wallet-bound one-time identity
- The first-run player name flow no longer depends on opening the wallet dialog. A dedicated first-entry name prompt now appears when the player has no saved name yet.
- The chosen name is written into local player state immediately, so it no longer disappears during the delay before the normal debounced save runs.
- Wallet/session restore no longer wipes a first-run local nickname just because the server wallet row is still empty. Until the server row gets its first nickname, the local first-run name is preserved as the seed.
- `save-player-progress` now treats `nickname` as immutable after first write: once a wallet row has a nickname, later saves cannot silently rename that wallet.
- This aligns the intended flow:
  - player enters a name once
  - later links a wallet
  - that name binds to the wallet row and survives device changes through wallet restore

## Inventory, Boost, and Travel now use the new painted board artwork
- `Inventory` keeps its modal-over-game behavior, but the modal now uses the new inventory board artwork from `Downloads` instead of the old plain black dialog shell.
- `Boost` now uses the new boost board artwork for its purchase/session modal, with the existing boost and MON Expedition flows preserved.
- `Travel` now uses the new travel board artwork as its full-screen backdrop. The old synthetic blue ocean background was removed from the screen, and locked island cards now sit inside the board-aligned central viewport without the extra top-right coin chip.
- All three new backgrounds are served as optimized `webp` assets under `public/assets/`.

## Quest boards now use the painted artwork set for all task tabs
- `Tasks -> Daily`, `Blockchain`, `Weekly`, and `Social` now use the painted quest-board artwork set from `Downloads` as the active quest-screen backdrop set instead of the old generic `bg_tasks.jpg` task background.
- The quest UI now switches backgrounds by tab:
  - desktop uses the wide board art
  - mobile uses the new tall board art
  - both paths are served as optimized `webp` assets, not raw runtime PNG
  - both paths now render as fullscreen `cover` backdrops instead of a contained image layer
- Cards now sit in one responsive board-aligned viewport per tab instead of an “image inside another image” composition.
- The old `Special` label was renamed to `Blockchain`, so wallet-linked quests and referral rewards now read as a first-class blockchain category instead of a vague misc bucket.
- Quest cards were also rebalanced to line up better:
  - card containers are flex-column based
  - action buttons pin to the bottom
  - hover emphasis no longer clips the top row
- The board viewport now has separate desktop/mobile safe-area behavior:
  - tabs and the coin chip live inside the board viewport instead of floating above it as a separate layer
  - mobile moves the info plaque into the scroll flow, so it no longer fights the bottom nav or overlaps the task list
  - viewport sizing now follows the same cover-math as the fullscreen backdrop, so the card area fills the central grey zone more cleanly

## Grill board now uses the new painted grill artwork
- `Grill` now follows the same fullscreen painted-board direction instead of the old generic `bg_grill.jpg` background:
  - desktop uses the new wide grill board from `Downloads`
  - mobile uses the new tall grill board from `Downloads`
  - both are served as optimized `webp` assets
- The grill UI now renders inside the same centered safe-area viewport logic as the quest boards, so the score panel and recipe list stay aligned within the grey center instead of floating over the full-screen art.

## Wallet, referral, and inbox removed from Settings
- `Settings` is now trimmed back to actual settings/admin/profile functions: avatar upload, sound toggle, guide link, and admin entry stay there, but wallet actions, referral tools, MON withdraw UI, and inbox are no longer mixed into that dialog.
- Wallet management and MON reward/withdraw status now live only in the separate HUD wallet button, which keeps connection, verification, nickname binding, and MON payout history in one dedicated place.
- Inbox now has its own HUD mail icon and only appears when there are unread admin messages, so `Settings` no longer carries a message center.
- Referral utility for the existing `invite_friend` special task moved into `Tasks -> Special`: players can now copy their referral link and see rewarded-referral progress directly on the task card instead of opening `Settings`.

## Weekly grill payouts aligned with the new economy budget
- Closed a backend drift left over from the economy rollout: the admin weekly grill payout engine was still using the old hardcoded `[5, 3, 1] MON` top-3 schedule, while the new economy config already defined the safer `10 MON total / top 10` payout ladder.
- `supabase/functions/_shared/weeklyPayouts.ts` now matches the intended budget:
  - `#1 2.5`
  - `#2 1.75`
  - `#3 1.25`
  - `#4 1.0`
  - `#5 0.75`
  - `#6-10 0.5`
- This keeps admin preview/apply payouts consistent with the retention-first economy plan instead of accidentally overpaying the leaderboard after live deploy.

## Economy rollout defaults now enable the new client layers
- The last practical rollout blocker for the public client was removed: `PREMIUM_SESSIONS_ENABLED` and `WEEKLY_MISSIONS_ENABLED` now default to `true` in `src/lib/baitEconomy.ts` instead of `false`.
- This means the new retention/economy UI layers no longer depend on an out-of-band VPS env sync to appear on `https://www.hookloot.xyz`:
  - premium sessions
  - weekly missions
  - collection book
  - cube rebalance
- Public env flags can still override these defaults later, but the production build is no longer stuck in the old hidden-state just because `/opt/hookloot/.env.production` has not been manually refreshed.

## Root verify script and CI now use the same gate
- The active app repo now has one clear root verification entrypoint:
  - `npm run verify` = `lint + typecheck + build`
  - `npm run verify:ci` = `lint + typecheck + build:pages`
- This repo is still a single-package npm app, not a workspace/turbo monorepo, so the new verification layer was added directly in the root `package.json` instead of introducing another runner.
- `typecheck` is now an explicit root script based on the existing TypeScript build setup (`tsc -b --pretty false`), and the previously broken typecheck surface was fixed so the new gate is real instead of aspirational.
- `.github/workflows/deploy.yml` now uses the same root script (`npm run verify:ci`) before publishing `dist/`, so local and CI verification no longer drift.
- `AGENTS.md` and `README.md` were aligned to make `npm run verify` the mandatory final local check before merge or deploy.

## Live Supabase rollout locked to the working project
- Local Supabase CLI auth is now configured on this machine for the Hook & Loot repo, and the working project is explicitly locked to `oyhyoqnhqifcwjyputif`. Future Supabase work for this game should continue against that single project instead of drifting back to duplicate environments.
- Live backend rollout was completed on 2026-04-22 for the current economy/save foundation:
  - applied `20260422004500_remove_starting_bait.sql`
  - applied `20260422013000_add_premium_fishing_sessions.sql`
  - deployed `save-player-progress`
  - deployed `player-actions`
- Post-deploy smoke through `https://www.hookloot.xyz/api/edge/*` now reaches the updated functions and returns the expected auth error (`401 Invalid session`) for dummy payloads, which confirms the domain is hitting the live deployed backend rather than an old function image.

## Economy progress persistence hardened for collection and rod mastery
- Closed the main save-sync gap created by the new retention layers: verified wallet saves can now round-trip `collectionBook` and `rodMastery` instead of only keeping them in local browser state.
- `useWalletAuth` now serializes `collection_book` and `rod_mastery` with the wallet-bound player payload, and it restores those fields back into `PlayerState` from `player.game_progress` when a verified snapshot comes from the server.
- `save-player-progress` now sanitizes and preserves both structures inside `game_progress`:
  - same-device player saves can push updated album/mastery data even when no explicit `game_progress` payload is being saved in that request
  - stale-base merges now keep the richer `collectionBook` / `rodMastery` state instead of letting a partial save wipe it
- `_shared/gameProgress.ts` was extended to understand the same two structures so future backend consumers no longer treat them as unknown extra keys.
- This is still repo-level hardening only until the working Supabase project gets a fresh function deploy, but the code path is now aligned end-to-end instead of leaving the new economy meta progression browser-local.

## Premium fishing DB schema foundation
- Added a new migration `20260422013000_add_premium_fishing_sessions.sql` to create the first server-authoritative storage layer for the planned premium MON-fishing loop.
- New table `public.premium_fishing_sessions` stores one active/completed premium session per player with:
  - wallet/player identity
  - session price in MON
  - casts total / casts used
  - luck meter stacks
  - zero-drop streak
  - rescue eligibility
  - recovered MON total
  - lifecycle timestamps
- New table `public.premium_fishing_casts` stores every resolved premium cast with:
  - ordered cast index per session
  - reaction quality
  - resolved fish id
  - bonus coins / XP
  - MON drop tier / amount
  - luck meter before/after
  - zero-drop streak after the cast
  - pity / rescue / hot-streak flags
- Both tables follow the existing live repo pattern:
  - `gen_random_uuid()` primary keys
  - service-role-only RLS policies
  - indices for active-session lookup and cast audit queries
  - partial unique index that keeps premium sessions to one active session per player
- This step is schema-only: no premium gameplay behavior is live yet, but the backend now has a proper table foundation for the upcoming shared premium engine and `player-actions` endpoints.

## Shared premium fishing backend engine
- Added `supabase/functions/_shared/premiumFishing.ts` as the new backend-side source of truth for the premium MON-fishing math, instead of planning to scatter roll logic across `player-actions`.
- The helper now carries the first complete server-side premium engine pieces:
  - premium fish pool mirrored from the current game economy
  - fish rarity uplift for premium casts
  - MON drop table
  - luck meter adjustment
  - pity threshold handling
  - bounded rescue drop path
  - hot-streak carryover handling
  - one resolver for a premium cast result
  - one mapper from DB session rows into the frontend-friendly premium session state shape
- This is still foundation work only: no endpoint uses the helper yet, but the repo now has a single backend module ready for the next step (`player-actions` premium endpoints) instead of leaving those rules implicit in the design notes.

## Premium session actions in player-actions
- Extended `supabase/functions/player-actions/index.ts` with the first server-authoritative premium session API surface:
  - `start_premium_session`
  - `get_premium_session_state`
  - `resolve_premium_cast`
  - `complete_premium_session`
- `start_premium_session` now verifies an on-chain MON payment transaction to the configured receiver address, blocks tx-hash reuse via `player_audit_logs`, enforces one active premium session per player, and creates a tracked `premium_fishing_sessions` row.
- `get_premium_session_state` now returns the current active premium session (or an idle state) directly from server tables instead of requiring any client-side premium session source of truth.
- `resolve_premium_cast` now performs the premium fishing resolution on the backend:
  - loads the active session
  - applies premium fish rarity uplift
  - preserves existing rod + NFT rare-fish bonuses
  - applies premium MON drop logic through the shared helper
  - increments catch / rare-fish daily task progress
  - updates player XP, level, level-up coin rewards, inventory, and total catches
  - inserts a cast audit row in `premium_fishing_casts`
  - grants MON through the existing reward helper when a premium MON drop happens
  - writes a `premium_cast_resolved` audit log
- `complete_premium_session` now finalizes a spent session on the backend and returns the canonical session state.
- Important rollout note: these endpoints are implemented in repo code only so far. They still need a working Supabase deploy plus the new migration applied before the premium loop can be exercised live from the client.

## Economy config foundation for premium fishing rollout
- Added a first centralized economy foundation layer in `src/lib/baitEconomy.ts` for the planned premium MON-fishing rollout instead of letting upcoming values spread across UI and edge functions.
- New feature flags now exist for the upcoming layers:
  - `VITE_PREMIUM_SESSIONS_ENABLED`
  - `VITE_COLLECTION_BOOK_ENABLED`
  - `VITE_WEEKLY_MISSIONS_ENABLED`
  - `VITE_CUBE_REBALANCE_ENABLED`
- Added the first source-of-truth constants for:
  - premium session price / cast count / guaranteed per-cast bonuses
  - premium MON drop table with computed EV per cast and per session
  - premium fish rarity weight modifiers
  - luck meter, pity, and rescue configs
  - album first-catch bonuses
  - weekly mission baseline rewards
  - weekly grill payout baseline budget
  - cube rebalance target config
- This pass is config-only: no live gameplay behavior changed yet, and the new systems are still effectively dormant until the next backend/UI steps wire them in.

## Premium session / collection / weekly mission types
- Extended `src/types/game.ts` with the first type-level model for the upcoming retention economy rollout:
  - `PremiumDropTierId`, `PremiumSessionStatus`, `ReactionQuality`
  - `PremiumCastResult`, `PremiumSessionState`
  - `CollectionSpeciesState`, `CollectionPageState`, `CollectionBookState`
  - `RodMasteryTrackState`, `RodMasteryState`
  - `WeeklyMissionId`, `WeeklyMission`, `WeeklyMissionProgress`, `WeeklyMissionStateMap`
- `PlayerState` can now optionally carry `collectionBook` and `rodMastery`, while `GameProgressSnapshot` can now optionally carry `weeklyMissions` and `premiumSession`.
- `WheelPrize` was widened in advance to support future cube rebalance reward kinds (`bait`, `album`, `premium_shard`) without forcing a later breaking type expansion when the UI/backend wiring starts.
- Removed duplicate premium type declarations from `src/lib/baitEconomy.ts` so the premium config layer now imports shared economy type names from `src/types/game.ts` instead of carrying its own parallel definitions.

## Grill sink fix before premium rollout
- Fixed the one clearly bad grill sink in the current recipe ladder before any premium-fishing rollout can make rare trophy catches more common or more emotionally important.
- `Deepwater Platter` no longer burns the `pike` / Purple Fish. The recipe now uses `catfish x2 + bream x1` while keeping the same `420` score, so the high-end midgame grill path still exists but no longer asks players to destroy a `10000-coin` trophy fish for a clearly irrational return.
- This keeps `pike` in the healthier role for Hook & Loot right now: rare collection / brag / sale value, not a punishing grill ingredient.

## Collection book and first-catch bonuses
- Added the first live collection retention layer on the client side:
  - `src/lib/collectionBook.ts` now defines album pages, normalization, merge logic, and species/page progression updates.
  - `Inventory` now shows an `Album` tab with page progress, species discovery state, and first-catch reward visibility.
- Collection is enabled by default through `COLLECTION_BOOK_ENABLED`, while still supporting an env override if it needs to be turned off quickly.
- Normal rod catches now update a wallet-local collection book and grant one-time first-catch coin bonuses using the centralized values in `ALBUM_FIRST_CATCH_BONUSES`.
- Wallet sync on the same device now preserves album progress instead of dropping it during server/local merge, even though the server does not yet persist collection data as a first-class field.

## Wallet-bound nickname and referral reward toast dedupe
- Wallet-linked identity merge was tightened: when a verified player snapshot comes back from the server, `nickname` and `avatarUrl` now always come from the server-side wallet row instead of being overwritten by whatever global local player state happened to be on this device. This keeps the visible name tied to the wallet rather than to the browser's stale cache.
- Referral reward toasts are now deduped per wallet and per reward event. `useWalletAuth` stores the last shown referral reward key (`createdAt + invited wallet + bait amount`) in local storage, so refresh / reconnect / session restore no longer re-show the same `+10 bait received` toast for an already processed referral reward.
- Live narrow referral smoke against the working Supabase confirmed that the actual reward itself is not duplicating on repeat invitee refresh/re-sign:
  - inviter after first referral: `bait 30`, `rewardedReferralCount 1`
  - inviter after invitee refresh: unchanged
  - inviter after invitee re-sign: unchanged

## Wallet check-in temporary repeatable test mode
- Added a temporary frontend-only test mode for `wallet_check_in` so repeated MON check-ins can be exercised right now even while the live backend flow is still unstable.
- The local RPC fallback no longer rejects a second same-day check-in if it comes with a new `txHash`; it now records the fresh transaction, keeps the streak stable for the same day, and updates the latest check-in hash.
- `Tasks -> Special -> Wallet streak check-in` no longer hard-disables itself after the first successful check-in in this test mode. If a player sends another valid check-in transaction, the task card stays usable and explicitly shows that another test check-in can be sent.
- `useGameProgress` now tracks the last wallet check-in `txHash` and reopens the `wallet_check_in` special task only when a genuinely new check-in transaction arrives, avoiding the old "claimed forever" lock while also avoiding false reopening on an ordinary page refresh.
- In this temporary test mode, claiming the `wallet_check_in` reward uses the local special-task claim path even for verified wallets so testing is not blocked by the still-flaky live backend claim route.

## Wallet verify hardening on VPS domain
- Found a live migration-specific risk in the wallet path: the working Supabase `verify-wallet` endpoint still advertises `Access-Control-Allow-Origin: https://kaimiewl.github.io`, so direct browser calls from `https://www.hookloot.xyz` are not a safe source of truth after the domain move.
- Hardened the frontend edge transport layer in `src/integrations/supabase/client.ts`: same-origin edge calls now preserve the real backend status/body in the thrown error instead of losing it behind a consumed `Response.clone()` path.
- `useWalletAuth` no longer relies on the generic `supabase.functions.invoke('verify-wallet', ...)` path for the three critical wallet actions (`verify`, `restore session`, `refresh session`). Those calls now go through a dedicated same-origin HTTP helper, which keeps wallet verification pinned to `https://www.hookloot.xyz/api/edge/verify-wallet` and avoids falling back to the CORS-sensitive direct Supabase path.
- Added richer console diagnostics for wallet verify failures so the next live error includes status/body context instead of only the old generic toast fallback.

## Fishing sound samples from Downloads
- Added real audio samples from `C:\Users\WInter\Downloads\РЫБАЛКА` into `public/assets/audio/` for the fishing loop instead of relying only on synthetic WebAudio tones.
- The multi-cast source track was sliced into seven short `cast_01.mp3` ... `cast_07.mp3` clips, and `useSoundEffects` now picks one at random on each cast so the rod throw no longer sounds identical every time.
- The caught-fish boat sound was trimmed into `fish_catch_boat.mp3` and is now used as the primary success/catch sound.
- Also wired the additional named sounds from the same folder into the mechanics they clearly map to:
  - `cube_spin_launch.mp3` for cube roll start
  - `grill_cook.mp3` when grill cooking begins
  - `coin_gain.mp3` for coin gain / buy-sell feedback
- The old synthetic cast/success sounds remain as a fallback path if an audio sample fails to preload or decode, so fishing SFX still work on browsers that reject sample playback.
- Sample warm-up now starts on the first real user interaction instead of immediately on mount, which avoids creating a suspended audio context too early on mobile while still priming the cast/catch clips for the next interaction.

## Wallet settings simplified
- The wallet area in `Settings` no longer shows the redundant `Sign In` / `Sign Up` split. Guests now get one clear `Connect wallet` action instead of two buttons that opened the same flow.
- Nickname setup was moved directly into the wallet block after connection: if the wallet is connected and no name is saved yet, the dialog now immediately asks for the player's name there instead of hiding it behind a separate nickname accordion lower in settings.
- This keeps the wallet flow closer to the intended mental model: connect wallet -> enter your name once -> continue with synced progress and wallet-only features.

## First-screen asset weight reduced
- Audited the current runtime asset path and confirmed that the main fishing scene itself was not bottlenecked by the fish sprites or lake backgrounds: `bg_main.jpg`, `bg_tasks.jpg`, `bg_wheel_v4.jpg`, and the fish sprites were already relatively small. The heavier pain points were large imported PNG cutouts used by the UI shell around gameplay.
- Re-encoded the heaviest actively used PNG cutouts to `.webp` and switched runtime imports to those optimized files:
  - `bottom_nav_arcade_strip_v2`: `~696 KB -> ~127 KB`
  - `map_travel_icon_cutout`: `~437 KB -> ~84 KB`
  - `grill-foreground`: `~894 KB -> ~225 KB`
  - each `map_*_cutout`: `~336-378 KB -> ~42-51 KB`
  - boot-critical `public/assets/pepe_boat_v3`: `~830 KB -> ~83 KB`
- Also re-encoded several still-active HUD/public assets that were not blocking boot but were unnecessarily heavy for routine runtime use:
  - `title_banner_v2`: `~293 KB -> ~52 KB`
  - `inventory_button_panel_v3`: `~244 KB -> ~45 KB`
  - `inventory_shortcut_icon_v2`: `~281 KB -> ~36 KB`
  - `boost_icon_v2`: `~369 KB -> ~51 KB`
  - `wheel_buy_roll_icon_v2`: `~480 KB -> ~89 KB`
  - `wheel_roll_cube_icon_v2`: `~187 KB -> ~37 KB`
- Removed the bottom navigation strip from the blocking main-scene preload list so the loading screen no longer waits on that non-critical decorative asset before showing the lake.
- Removed one redundant warm-preload duplication for `FISH_GOT_AWAY_PANEL_SRC`.
- Repo audit note: there are still some large source assets in `src/assets/` such as `character-animation.webm` and `character-new.png`, plus older large public alternates like `pepe_boat_v2.png` and legacy panel/icon PNGs, but they are not part of the main fishing boot path that was causing the mobile pain here.

## Starting bait removed and mobile preload tightened
- New accounts are now defined to start with `30` daily free bait and `0` reserve bait. The old `10` starter reserve bait was removed from the local initial player state, from the frontend bait-economy constant, and from the repo copy of `verify-wallet`.
- Added a new migration `20260422004500_remove_starting_bait.sql` so the `players.bait` default becomes `0`, new `process_wallet_login` inserts explicitly start at `0` reserve bait, and the wallet-connect bait bonus path only runs when the configured bonus is actually greater than `0`.
- Updated the live reward smoke script expectations to the new baseline: first wallet verify now expects `0 reserve + 30 daily`, and referral rewards stack from that clean base.
- Added a frontend compatibility repair for still-deployed old wallet baselines: if a brand-new player arrives from the backend with the legacy fresh-account bait profile (`10` or `20` reserve bait, no actual gameplay progress yet), the client now normalizes that pristine state back to `0 reserve / 30 daily` before merge and local sync. This keeps the new baseline visible on the live app even before the separate Supabase rollout lands.
- Tightened the mobile boot path so the loading screen now waits for the main scene assets instead of force-opening after `5s`. The image loader now has a per-asset timeout and waits for decode where possible, which is safer for mobile and reduces the chance of seeing fish placeholders right after the loading screen disappears.
- Important rollout note: the frontend/VPS part of this change can go live immediately after push, but the working Supabase project still needs a fresh `verify-wallet` deploy and the new migration before wallet-created server rows fully match the new `30 daily / 0 reserve` rule.

## VPS 403 origin mount fix
- Fixed the live VPS regression where `https://www.hookloot.xyz` could fall into `403 Forbidden` / `500 Internal Server Error` even though `/opt/hookloot/current/dist` still contained a valid build.
- Root cause: the `hookloot-web` container was not guaranteed to be recreated on each release switch, so it could keep a stale bind mount to an older release directory that later got pruned. Once that old release disappeared, nginx inside the container served an empty `/usr/share/nginx/html`, which produced `403` on `/` and an internal redirect cycle `500` on `/index.html`.
- `deploy/vps/server/deploy-hookloot.sh` now uses `docker compose ... up -d --force-recreate hookloot-web` both on the main deploy path and on rollback cleanup, and it runs a second healthcheck after release pruning so stale-mount regressions are caught immediately.
- The live server was repaired by force-recreating `hookloot-web` against the current release and then syncing the updated deploy script into `/opt/hookloot/bin/deploy-hookloot.sh`, so future auto-deploys use the fixed behavior.

## Reward mechanics smoke and wallet bonus merge fix
- Added a new live smoke script at `scripts/ops/smoke-live-reward-mechanics.mjs` plus `npm run ops:smoke:rewards`. It verifies the main reward-bearing loops on the working Supabase project without service-role access: first wallet verify, repeat verify, first and second referral payouts, duplicate-referral blocking on repeat invitee login/sign, daily task claim rewards, grill cook/sell rewards, and cube reward application idempotence.
- Live smoke result for the current working backend: the suspected duplicate referral payout did **not** reproduce. A fresh inviter got exactly `+10` reserve bait per unique invited wallet, repeated login/sign of the same invitee did not pay twice, and the inviter reward count increased only once per new invitee.
- Live smoke also confirmed the current baseline economy on wallet verify: a fresh verified wallet receives `20` reserve bait and `30` daily free bait on the server, so a new verified player should effectively have `50` total visible bait when both buckets are shown together.
- Fixed a real client-side wallet sync risk in `mergeSyncedPlayerState`: reserve bait is now merged by separating non-bonus bait from server-granted bonus bait (`bonusBaitGrantedTotal`) before recombining, instead of blindly taking `Math.max(server.bait, local.bait)`. This prevents wallet/referral bonus bait from being silently lost when a guest already earned local reserve bait before attaching a wallet.
- Fixed a companion client bug in `useGameState`: local guest-only bait rewards no longer increment `bonusBaitGrantedTotal`. That field is now reserved for server-issued bonus bait tracking instead of being polluted by ordinary local task rewards.

## VPS wallet/music/grill follow-up
- Wallet attach flow was re-checked after the VPS/domain cutover: there is no hardcoded GitHub Pages origin in the wallet/session path, referral links now derive from the current `window.location.origin`, and the RainbowKit/Wagmi setup remains domain-agnostic in repo code.
- Background music unlock on mobile is now more robust: the app no longer removes its first-interaction audio listeners before music has actually started, and it now retries on `pointerup`, `click`, and `touchend`, which is safer for mobile browsers that do not unlock WebAudio on the earliest touch event.
- Grill UX copy now makes the cooked-dish loop explicit to players: after cooking, the result card says the dish was saved to `Inventory -> Dishes`, and the grill screen itself now states that dishes are stored there and can be sold later for gold.

## Wallet-bound progress hardening
- Cross-device wallet sync was hardened on the client side: `mergeSyncedPlayerState` no longer lets any non-empty stale local `inventory` or `cookedDishes` override richer server state. Inventory and cooked dishes now merge by stack key with max quantity preservation instead of the old `local wins if non-empty` rule.
- Server player rows are now normalized into proper `PlayerState` arrays with parsed `Date` objects for `inventory.caughtAt` and `cookedDishes.createdAt` before client merge logic runs, reducing type drift between local and server snapshots.
- A new live smoke script was added at `scripts/ops/smoke-live-progress-persistence.mjs` plus `npm run ops:smoke:progress`. It verifies wallet-bound persistence for coins, bait, daily free bait, XP, rod progression, inventory, cooked dishes, NFT rods, nickname/avatar, daily tasks, special tasks, wheel rolls, grill score, and dishes count, then simulates a stale-device overwrite attempt to confirm newer progress is not lowered.
- The current code now keeps both special tasks in server save sanitization: `invite_friend` and `wallet_check_in`.
- Important live finding: the newly added progress smoke currently fails against the already deployed working Supabase because the live `save-player-progress` function still strips `wallet_check_in` from `specialTasks`. The repo code is fixed, but the working project still needs a fresh `save-player-progress` deploy before that specific special-task persistence is truly live.

## VPS blank-screen hotfix
- Fixed the first production blank-screen issue on `https://www.hookloot.xyz`: the VPS and domain were serving the app bundle correctly, but the client could get stuck behind the fixed `GameLoadingScreen` overlay when critical main-scene preload never resolved.
- `FishingGame` now has a `5s` fail-open boot timeout for the main scene preload. If the critical preload stalls, the app promotes itself to ready state instead of keeping the screen at `0-4%` forever.
- This is intentionally additive and low-risk: the main lake canvas already has its own image fallback path, so the UI can render safely even when the eager preload hangs on one asset.

## VPS deployment contour
- Added a dedicated VPS deploy pack for `vm3661` so Hook & Loot can move off GitHub Pages without touching the existing `n8n` / `tailscale` runtime on that server.
- The repo now includes an isolated Docker web contour under `deploy/vps/`: one `nginx` container (`hookloot-web`) bound only to `127.0.0.1:18181`, SPA routing config, ingress templates for `hookloot.xyz` / `www.hookloot.xyz`, and a release-based deploy flow rooted at `/opt/hookloot`.
- Added server-side bootstrap/deploy scripts for a bare-repo push model: `/opt/hookloot/repo.git` receives `main`, a `post-receive` hook creates a timestamped release, builds with `node:20` in Docker, atomically switches `/opt/hookloot/current`, restarts only the game container, runs smoke checks, and prunes old releases.
- Added local helpers `npm run vps:install`, `npm run vps:add-remote`, `npm run vps:sync-env`, and `npm run vps:mirror-origin` plus `docs/vps-deploy.md` so this machine can bootstrap the VPS, sync the public production env, and mirror `git push origin main` into the VPS bare repo for immediate site updates after each normal push.

## Wallet streak special task
- `Special -> Wallet streak check-in` is now a separate wallet-linked task instead of reusing the ordinary `Daily check-in`.
- The flow now expects one verified micro-transaction (`0.0001 MON`) to the configured receiver address, then verifies it against Monad RPC through the existing backend action layer before marking today's special task ready.
- The task card now shows the current consecutive-day streak, whether today is already checked in, and exposes an explicit `Check in with MON` action for verified wallets.
- If no wallet is connected, the same task card now offers a live `Connect wallet to check in` CTA instead of only showing a disabled transaction button.
- Raw Supabase edge-function failures for player actions are now masked behind task-specific user-facing copy, so players no longer see technical messages like `Edge Function returned a non-2xx status code` on wallet check-in or similar actions.
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
- wallet streak check-in now has a client-side fallback for the current live rollout gap: if the deployed `player-actions` function still does not expose wallet check-in actions, the frontend verifies the submitted `txHash` directly against Monad RPC, stores a local streak summary per wallet, marks the `wallet_check_in` special task complete, and lets the player claim the `10 bait` reward locally instead of failing with a technical edge-function error
- Hook & Loot frontend hosting is now live on the isolated VPS contour instead of depending on GitHub Pages: `/opt/hookloot` on `vm3661` serves the production build through `hookloot-web` on `127.0.0.1:18181`, the public host nginx proxies `hookloot.xyz` / `www.hookloot.xyz`, Let's Encrypt is issued for both names, and the canonical public URL is now `https://www.hookloot.xyz`
- 2026-04-21: Fixed hookloot.xyz wallet connect regression by routing frontend edge-function calls through same-origin `/api/edge/*` on VPS and stopping forced wallet disconnect after verify errors. This removes the old GitHub Pages origin dependency from wallet/session flows on the new domain.
- 2026-04-21: Added manual wallet re-verify path in Settings after failed attach attempts. Connected-but-unverified wallets now show a retry button and error text instead of getting stuck with no way to finish linking.
- 2026-04-22: Premium economy Phase 1 client shell is now wired in behind flags: `usePlayerActions` exposes premium session actions, `BoostDialog` can submit a `MON Expedition` payment after receipt confirmation, and `FishingGame` can refresh/show active premium session state without turning the feature live by default.
- 2026-04-22: Premium economy Phase 1 cast integration is now wired through the existing lake loop behind flags: `useGameState` has a non-economic premium cast animation path, `FishingGame` routes active expedition casts/reels/timeouts through server `resolve_premium_cast`, and premium sessions no longer require bait to use the normal fishing HUD.
- 2026-04-22: Collection book foundation is now live in the client: catches update an `Album` tab in `Inventory`, first-time species catches grant one-time coin bonuses, and wallet/local player merge keeps collection progress from being overwritten by stale local sync.
- 2026-04-22: Cube rebalance is now wired on both client and backend: cube faces shift part of value from liquid coins into fish and bait, the rare secret hit is now `1 MON`, and cube reward application supports `bait` prizes in both local and verified-wallet reward paths.
- 2026-04-22: Weekly missions foundation is now wired in the client and save schema: `useGameProgress` tracks weekly ladders and weekly cube-unlock days, `TasksScreen` has a weekly tab behind the weekly feature flag, and `FishingGame` now records dish sales / premium-session completion into weekly progress while preserving build compatibility with the new `save-player-progress` weekly fields.
- 2026-04-22: Economy telemetry scaffolding now exists for the new weekly/premium layer: client-side progress and claim events are queued into `window.__hookLootTelemetryQueue` for weekly mission progression, weekly mission claims, daily cube-unlock progression, and premium-session completion without changing live economy behavior yet.
- 2026-04-22: Weekly mission progression/claims are now partially server-authoritative in `player-actions`: daily-task cube unlocks increment the weekly `cube_3_days` mission once per day, `cook_recipe`, `sell_cooked_dish`, and `complete_premium_session` now advance their weekly ladders on backend updates, and `claim_task_reward` can now award weekly rewards including bonus cube charges without relying on client-only weekly claim state.
- 2026-04-22: Verified-wallet weekly mission claims now use the backend `claim_task_reward` path from `FishingGame` instead of local-only mission claiming, removing the last obvious split-brain between weekly client progress and reward-critical server state before the weekly feature flag is enabled.
- 2026-04-22: Economy rollout scaffolding now supports cohort-based enablement on the client: premium sessions, weekly missions, collection book, and cube rebalance can be gated by rollout percentage plus allowlist in `baitEconomy`, and `FishingGame` now passes resolved feature availability into the local progress/state hooks and child dialogs instead of relying only on repo-wide boolean flags.
- 2026-04-22: Live economy rollout is now enabled by default in the production client path: premium sessions and weekly missions no longer depend on manual VPS `VITE_*` rollout flags to appear, and the VPS env sync script can now mirror extra `VITE_` keys instead of only the original four base variables.
- 2026-04-22: Post-rollout live smoke found and fixed two real backend drifts on the working Supabase project: `verify-wallet` was redeployed so fresh wallets now start with `0` reserve bait and `30` daily free bait, and `save-player-progress` no longer lets stale device saves lower `equipped_rod` while keeping wallet/special-task progress intact.
- 2026-04-22: Live smoke is green again against `oyhyoqnhqifcwjyputif`: reward mechanics passed end-to-end for referrals, daily tasks, cube, and grill, and progress persistence passed for stale-save merge protection including `wallet_check_in` special-task retention.
- 2026-04-22: Ops coverage now includes a dedicated weekly/collection live smoke path: `scripts/ops/smoke-live-weekly-collection.mjs` exercises weekly mission rewards (`catch_60_fish`, `cook_5_dishes`, `cube_3_days`) plus stale-save protection for `collectionBook`, so future post-deploy checks cover those economy layers without manual dashboard inspection.
- 2026-04-22: Post-rollout client noise was reduced on the live game surface: background premium-session and social-task refreshes no longer stack duplicate generic toast errors, the fish screen no longer double-fetches premium session state on mount, and premium player-action fallbacks now show specific recovery copy instead of the catch-all “This action is temporarily unavailable.”
- 2026-04-22: The live reward smoke script was updated to match the new cube economy: bait is now a valid authoritative cube reward after the rebalance, so `scripts/ops/smoke-live-reward-mechanics.mjs` no longer treats reserve-bait prizes as regressions when validating live `apply_cube_reward`.
- 2026-04-22: Wallet access is now surfaced through a dedicated top-HUD wallet button instead of forcing players into the overloaded settings flow, and background premium-session refresh on the fish screen now fails silently so temporary expedition-status outages no longer spam toast errors during normal play.
- 2026-04-22: Task and grill board safe areas are now screen-specific instead of sharing one generic viewport. `Tasks` and `Grill` use separate desktop/mobile inset maps based on the uploaded artwork, their info/header plaques now scroll with the board content instead of staying pinned, and horizontal drift inside the board viewport is now blocked so mobile cards stop sliding sideways across the frame.
- 2026-04-22: Mobile board fitting was tightened again after live feedback. `QuestBoard` now renders inline footers after the task list instead of before it, mobile task/grill cards and plaques use slimmer chrome, the usable center-panel insets were widened a bit, bottom clearance above the nav increased, and the Grill summary card is hidden on phones so the recipe list occupies the gray panel instead of stacking awkwardly.
- 2026-04-22: Desktop board framing was tightened after the first live screenshot as well. `Tasks` and `Grill` now use larger top/bottom safe-area insets on desktop so headers and lower plaques stay inside the gray panel instead of hiding under the wood frame or nav, while desktop boards keep fixed top/bottom chrome and scroll only the card list. Mobile insets were lifted once more to reduce bottom-nav collisions.
- 2026-04-23: Quest and grill board chrome was simplified after mobile/desktop layout feedback. `Tasks` no longer renders the extra top-right coin chip, mobile task/grill board viewports now extend closer to the bottom navigation, and `Grill` now uses the central gray board for a clean recipe grid instead of the old total-score/grill-art summary block.
- 2026-04-23: Shop received the same board-art treatment as tasks/grill. The new uploaded shop image is optimized into desktop/mobile WebP backdrops, the old `bg_shop.jpg` shell header is bypassed, and bait/rod purchase controls now sit inside the central board viewport with matching warm quest-card styling.
- Name save now uses a dedicated `save-player-name` Edge Function instead of the guarded full progress sync path. This avoids wallet-name saves being rejected by progress delta protections after hard refreshes or stale local gameplay snapshots.
- The mandatory `Choose your name` dialog no longer auto-hides just because a wallet-name save is pending. It stays in one flow until the wallet row actually comes back with a saved nickname.
- While a verified wallet still has no saved nickname, client autosaves for `player` and `game_progress` are now paused. This removes background `save-player-progress` races from the mandatory name-binding flow.
