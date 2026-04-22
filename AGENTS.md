# AGENTS.md

Follow `../AGENTS.md` first. This file only adds subtree-specific rules for the active app repo.

## Purpose
- `bright-greet-forge-main/` is the real working repo: Vite/React frontend, Supabase integrations, and GitHub Pages deploy.

## Local map
- `src/components/game/`: fishing/gameplay screens and HUD.
- `src/hooks/`: game state, wallet auth, sound, progress.
- `src/lib/`: shared helpers, asset loaders, leaderboard, wagmi config.
- `src/integrations/supabase/`: frontend Supabase client/types.
- `supabase/functions/` and `supabase/migrations/`: backend-side logic and schema history.

## Commands
- Install: `npm ci`
- Run: `npm run dev`
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
- For Supabase/frontend contract changes, inspect both caller and backend files, then run `npm run build`.

## Done
- Smallest viable diff is in place.
- `npm run verify` passes locally for the touched repo.
- CI should still use the same root-level verification entrypoint (`npm run verify:ci`).
- If tests are mentioned in a task, state explicitly that this repo currently has no dedicated unit/e2e test runner unless one is added intentionally.
