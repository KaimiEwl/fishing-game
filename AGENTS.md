# AGENTS

## Working style
- Prefer small, shippable fixes over large rewrites.
- Protect the existing desktop and mobile flows unless a change is explicitly required.
- Before each milestone, identify the root cause first, then change the minimum number of files needed.
- After each milestone:
  1. update `STATUS.md`
  2. run `npm run build`
  3. run `npm run lint`
  4. fix critical failures before moving on

## Repo conventions
- Main app entry for the game flow: `src/components/game/FishingGame.tsx`
- Main gameplay canvas: `src/components/game/MonadFishCanvas.tsx`
- HUD / controls / shell components live in `src/components/game/`
- Use `apply_patch` for code edits.
- Avoid staging unrelated dirty files.

## Current priority
- Build a stable playable vertical slice of the fishing game.
- Keep the main gameplay loop working end-to-end:
  cast -> bite -> hook/reel -> reward -> inventory update -> feedback
- Fix visible regressions on the main screen while preserving existing tabs.

