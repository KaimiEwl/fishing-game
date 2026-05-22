# AGENTS.md

Follow `../AGENTS.md` first. This file only adds subtree-specific rules for the active app repo.

## Purpose
- `bright-greet-forge-main/` is the real working repo: Vite/React frontend, owned Node API, SQLite-backed game data, and VPS deploy assets.

## Local map
- `src/components/game/`: fishing/gameplay screens and HUD.
- `src/hooks/`: game state, wallet auth, sound, progress.
- `src/lib/`: shared helpers, asset loaders, leaderboard, wagmi config.
- `src/types/serverDatabase.ts`: frontend row-shape types for owned server payloads.
- `server/`: owned Hook & Loot API and SQLite persistence.
- `deploy/vps/`: VPS compose/nginx/deploy files for the web + API stack.

## Commands
- Install: `npm ci`
- Run: `npm run dev`
- API: `npm run server`
- Build: `npm run build`
- Typecheck: `npm run typecheck`
- Repo verify (required before merge/deploy): `npm run verify`
- CI verify (Pages artifact): `npm run verify:ci`
- Dev build: `npm run build:dev`
- Preview: `npm run preview`
- Lint: `npm run lint`
- Tests / format: Not found in `package.json`

## Working rules
- Read `PLANS.md` and `STATUS.md` before substantial work.
- Update `STATUS.md` when a task materially changes app behavior, validation status, or repo workflow.
- Prefer existing gameplay/UI patterns over new abstractions.
- Keep asset path changes deliberate; many UI pieces depend on current filenames/public paths.
- Do not stage `public/assets/pepe_final.png` or `crop.py` unless the task explicitly requires them.

## Validation
- For repo-wide final validation, run `npm run verify`.
- UI/gameplay changes: `npm run build` is still the cheapest first gate.
- `npm run lint` is now part of `npm run verify` and currently passes with warnings only; do not treat those warnings as a blocker unless the task specifically targets them.
- `npm run typecheck` is the required static contract gate for TS changes.
- For owned API/frontend contract changes, inspect both caller and `server/index.mjs`, then run `npm run typecheck` and `npm run build`.

## Done
- Smallest viable diff is in place.
- `npm run verify` passes locally for the touched repo.
- CI should still use the same root-level verification entrypoint (`npm run verify:ci`).
- If tests are mentioned in a task, state explicitly that this repo currently has no dedicated unit/e2e test runner unless one is added intentionally.
