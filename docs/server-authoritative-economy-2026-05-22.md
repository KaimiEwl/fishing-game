# Server-Authoritative Economy Audit

Date: 2026-05-22

This pass verifies that release-critical economy actions are resolved and stored by the owned API. The frontend may choose an action or package tier, but it must not provide final balances, prices, drops, or reward amounts.

## Coverage

| Surface | Server authority |
| --- | --- |
| Cast start | API consumes bait/free bait and creates a pending cast with a server-issued resolve token. |
| Cast resolve | API validates the pending cast/token, rolls fish/XP/coins/MON/special rewards, stores inventory/progress, and rejects duplicate resolves. |
| Fish sell | API validates inventory and computes sell price from server fish and rod bonus data. |
| Bait buy | Client sends bait amount only; API accepts only canonical bait package amounts and computes coin cost. |
| Rod buy/equip | Coin rod purchase no longer trusts client cost and is unavailable unless a server coin price is configured; equip validates owned rod level. MON rod unlock remains verified by the purchase API's server price table. |
| Cube roll | API consumes server-tracked daily/paid rolls, rolls prize server-side, stores a pending roll, and applies each pending roll once. |
| Cube paid rolls | Client sends roll package and tx hash only; API accepts only canonical MON roll packages and computes expected MON. |
| Task claim | API validates server progress and claim state before applying rewards. |
| Cooking | API validates inventory, consumes ingredients, stores cooked dish, increments weekly progress, and updates grill score from server recipe config. |
| Dish sell | API validates cooked dish inventory and computes coin payout from server recipe config. |
| Fishing net | Client sends net tier and tx hash only; API accepts only canonical MON net packages, computes expected MON, rolls pending catch server-side, and stores net state. |
| Premium session | API computes session price/cast count, verifies tx, ignores client-authored reaction quality, owns all premium cast rewards, and completes the weekly mission only when the final server cast resolves. |
| MON reward | Legacy client MON grant endpoint now returns 410; normal rod MON rewards are produced during server cast resolution. |
| Wallet check-in | API requires a verified wallet tx, computes the required MON amount, records one server check-in per day, and updates special-task progress server-side. |
| Referral rewards | API grants referral bait during wallet verification/linking from server referral state and caps rewarded referrals. |
| Grill leaderboard | Authenticated server actions preserve existing score/dish values during name sync, cooking writes cumulative server grill score, and the old public write/delete fallback is disabled. |

## Direct Tamper Smoke

`scripts/ops/smoke-api.mjs` now probes direct API abuse cases:

- bait underpay and invalid bait package;
- coin rod underpay;
- invalid fishing net and cube-roll package tiers;
- missing wallet check-in tx;
- manual premium completion;
- direct fishing MON grant;
- direct Leviathan bonus grant;
- client-authored grill leaderboard score/dish values;
- public leaderboard writes/deletes;
- unauthenticated `verify-purchase` calls;
- duplicate, cross-endpoint, concurrent, and already-applied payment tx reuse when fake payments are enabled;
- repeated paid-flow attempts for fishing net, cube rolls, wallet check-in, premium sessions, and cube reward application;
- client audit-log tx poisoning attempts;
- client-authored premium reaction-quality tampering;
- concurrent duplicate fishing-net claims.

## Remaining Release Risks

The payment tx ledger now blocks duplicate tx hashes before verification and applies verified purchases through an atomic `verified` -> `applied` phase, so retries cannot double-grant paid rewards. `/verify-purchase` requires the active wallet session, failed reservations can be retried by the real tx owner, deterministic MON reward sources are unique, and cube/premium/net-claim reward writes run in server transactions. The next anti-cheat task should still add broader per-action idempotency keys, replay windows, and deeper audit reporting for every high-value action.
