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
- Dev build: `npm run build:dev`
- Preview: `npm run preview`
- Lint: `npm run lint`
- Tests / format / typecheck: Not found in `package.json`

## Working rules
- Read `PLANS.md` and `STATUS.md` before substantial work.
- Update `STATUS.md` when a task materially changes app behavior, validation status, or repo workflow.
- Prefer existing gameplay/UI patterns over new abstractions.
- Keep asset path changes deliberate; many UI pieces depend on current filenames/public paths.
- Do not stage `public/assets/pepe_final.png` or `crop.py` unless the task explicitly requires them.

## Validation
- UI/gameplay changes: run `npm run build` first.
- Run `npm run lint` only when useful; repo-wide lint debt already exists and may fail outside the touched area.
- For Supabase/frontend contract changes, inspect both caller and backend files, then run `npm run build`.
