# Release Handoff

Release check date: 2026-04-25 local workspace time.

## Current Release Target
- Primary public host: `https://www.hookloot.xyz`
- Production frontend build path for VPS: `npm run build`
- GitHub Pages fallback/CI artifact path: `npm run build:pages`
- Working Supabase project: `oyhyoqnhqifcwjyputif`

## Verified Locally
- `npm run verify` passed.
  - Runs ESLint, TypeScript project build, and Vite production build.
- `npm run verify:ci` passed.
  - Runs ESLint, TypeScript project build, and GitHub Pages artifact build.
  - Confirmed `dist/404.html` is created by `scripts/build-pages.mjs`.
- `npm run build` passed after the CI check.
  - Leaves `dist/` in the root-base shape expected by the VPS host.
- Production preview smoke passed at `http://127.0.0.1:4173/`.
  - App booted past the loading screen.
  - Main fishing HUD rendered.
  - Browser console reported `0` errors during the smoke.

## Known Non-Blocking Warnings
- ESLint still reports existing warnings only:
  - React hook dependency warnings in `RodPreviewBadge.tsx` and `MonadFishCanvas.tsx`.
  - Fast Refresh export-shape warnings in shared shadcn/ui component files.
- Vite/Rollup still reports existing warnings only:
  - Some wallet/provider chunks are larger than `500 kB`.
  - `caniuse-lite` browser data is old.
  - Several third-party `ox` package pure annotations are ignored by Rollup.

## Important Notes
- `tmp/` is intentionally ignored by ESLint now, matching `.gitignore`, so old local audit scratch files cannot fail release checks.
- Local Vite preview is not a reliable runtime smoke for the GitHub Pages base path `/fishing-game/`, because the local server does not mount `dist` under that prefix. The CI Pages artifact still builds successfully.
- Live Supabase mutation smoke was not run in this pass because it requires an admin wallet/session token and can touch live data.
- No production push/deploy was performed in this pass.

## Release Commands
```powershell
npm ci
npm run verify
npm run verify:ci
npm run build
```

For VPS deploy, use the existing VPS workflow from `docs/vps-deploy.md` after confirming the target branch and environment:

```powershell
git push vps main
```

For GitHub Pages fallback, pushing `main` triggers `.github/workflows/deploy.yml`.
