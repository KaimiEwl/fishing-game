# Release QA pass - 2026-05-22

Scope: first unchecked release task from `tasks.md`: full gameplay QA pass on desktop and mobile.

## Environment

- Local frontend: `http://127.0.0.1:5175`
- Local API health: `http://127.0.0.1:8787/healthz` returned `ok`
- In-app browser desktop pass plus Playwright mobile viewport `390x844`
- Browser wallet UI pass used a local injected EIP-1193 QA provider named `HookLoot QA Wallet`
- Production API smoke had already passed for `https://www.hookloot.xyz` before this local gameplay QA pass

## Desktop checks

- [x] Lake screen renders and exposes the main controls.
- [x] Cast flow starts from the UI and returns to `Cast line`.
- [x] Inventory opens, shows fish inventory, and closes.
- [x] Bottom navigation opens `Tasks`, `Shop`, `Grill`, `Cube`, `Board`, and returns to `Fish`.
- [x] Travel map opens and returns with `Back`.
- [x] Settings opens and links to the guide.
- [x] Fish info opens and shows fish chance/price rows plus guide/terms/privacy links.
- [x] Level details expand and show guest nickname, level, XP, coins, bait, catches, and inventory.
- [x] Direct routes `/guide`, `/terms`, `/privacy`, and `/admin` load without a blocking boot overlay.
- [x] Fresh guest linked a wallet from the player-facing wallet dialog and continued from the same server progress.
- [x] Inbox opened from the player panel and displayed an unread admin message.

## Mobile checks

- [x] Main lake screen fits a `390x844` viewport with top controls, cast button, travel button, and bottom nav reachable.
- [x] Mobile cast flow starts from the UI and returns to `Cast line`.
- [x] Mobile inventory dialog opens, shows empty/fish state inside the viewport, and closes.
- [x] `Tasks`, `Shop`, `Grill`, `Cube`, and `Board` open from the bottom navigation.
- [x] Wallet modal opens, explains wallet linking, and closes.
- [x] Travel map opens from mobile and returns with `Back`.
- [x] Settings opens from mobile, exposes the guide entry, and closes.
- [x] Fish info opens from mobile with fish chance/price rows plus `Guide`, `Terms`, and `Privacy` links.
- [x] Level details expand and collapse on mobile without blocking cast controls.
- [x] Fresh guest after storage clear receives a server guest session.
- [x] Fresh guest cast state survives reload through the server API.
- [x] Inbox opens on mobile, displays the unread admin message, and `Open first unread` marks it read on the server.
- [x] Mobile direct routes `/guide`, `/terms`, `/privacy`, and `/admin` load without a blocking boot overlay.

## Persistence check

Fresh guest created during QA:

- Guest id: `guest:c62a1f84-80eb-49f6-a843-eb7aa1d35cc4`
- Before cast: `daily_free_bait=30`, `xp=0`, `total_catches=0`, `inventory=[]`
- After cast + reload: `daily_free_bait=29`, `xp=5`, `total_catches=0`, `inventory=[]`

This confirms that the visible UI action was persisted through the owned API and restored after reload.

## Guest to wallet continuity UI check

Desktop UI was checked from a fresh browser state with a generated throwaway wallet exposed as `HookLoot QA Wallet`. The provider signed the same verification message through a real `viem` account signature.

- Guest id: `guest:9fabe6b2-adbd-4508-a2da-5947c6cd47d1`
- Linked wallet: `0xf714c1f145a42e84afee79848864cf874b32965d`
- Wallet button path: `Open wallet` -> `Connect wallet` -> `HookLoot QA Wallet`
- Player name prompt accepted `QA_Player_0522`
- Guest before link: `daily_free_bait=29`, `xp=55`, `total_catches=1`, inventory `catfish x1`
- Wallet restored by session after link: `daily_free_bait=29`, `xp=55`, `total_catches=1`, inventory `catfish x1`, nickname `QA_Player_0522`
- The old guest session was cleared from browser storage after the server confirmed the link.

Result: guest progress continued on the linked wallet account and the old guest profile no longer restored as an active separate profile.

## Inbox check

Player inbox was checked through both the owned API and the player-facing UI.

- Test wallet: `0xfe82c468e2c91a49256f70bfd362389a7667b57b`
- Admin `send_player_message` delivered message `4e8adc0b-d7fa-44e3-8339-51d6ec1de582`.
- Player `get_unread_count` returned `1`.
- Player `list_my_messages` returned the sent message.
- Player `mark_message_read` set `read_at=2026-05-22T11:26:03.203Z`.
- Player `get_unread_count` returned `0` after marking the message read.
- UI wallet: `0xf714c1f145a42e84afee79848864cf874b32965d`
- Admin sent UI message `QA inbox UI 1779449897842` to player `37672b2c-ebb0-4c9e-a5e5-5a3b7cba32c9`.
- Desktop UI displayed the message and `1 unread`.
- Mobile UI displayed the same message and `1 unread`.
- Mobile `Open first unread` marked the message read; API `get_unread_count` returned `0`.

## Findings

- Fixed: React dev console reported `fetchPriority` as an unknown DOM prop from image elements. The app now emits lower-case `fetchpriority` through a shared helper so the warning does not appear as a console error.
- Fixed: a normal verified non-admin wallet no longer probes the admin withdraw summary endpoint first. The client now asks `check_admin`, and the API returns `is_admin=false` without a `403`, so regular wallet sessions no longer create a red admin network error during gameplay.
- Fixed: `/admin` now reads `is_admin` explicitly. A non-admin wallet sees `Access denied`, while a local admin session still loads the admin panel.
- After the wallet/inbox reload, the browser console showed `0` errors and `3` warnings.
- Remaining non-blocking dev warnings: React Router future flag warnings, Lit dev-mode warning, and one dialog description warning from wallet UI. These are not blocking the gameplay flow but should remain visible in P2/P1 polish.

## Validation commands

- `node --check ./server/index.mjs` passed.
- `npm run typecheck` passed.
- `npm run build` passed with existing Browserslist, Rollup annotation, and large chunk warnings.
- `npm run lint` passed with the existing 11 warnings in older UI/canvas/shadcn files.
- `npm run ops:smoke` passed against the local owned API.
- Browser `/admin` re-check: non-admin wallet showed `Access denied`; admin session loaded the admin panel.

## Not covered manually in this pass

- Physical wallet extension/deep-link signing UI and payment transactions. This pass verified the in-game wallet button path with an injected QA provider and a real generated wallet signature; physical wallet extension and mobile wallet app UX belongs to the dedicated P0 wallet/payment task.
- Existing-wallet merge during guest-to-wallet linking. New-wallet guest linking was verified here; existing-wallet merge should be explicitly exercised during wallet/payment QA.
- Physical iOS Safari and Android Chrome devices. This pass used a browser mobile viewport; physical-device coverage remains in the device QA matrix task.
