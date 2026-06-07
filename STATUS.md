# MonadFish Status

This file tracks the public repository status for the open-source MonadFish app.

## Current State

- React/Vite browser game client is present under `src/`.
- Node API and server-side persistence live under `server/`.
- Shared economy settings live under `shared/`.
- GitHub Pages deployment is configured through `.github/workflows/deploy.yml`.
- Full API-backed production deployment assets live under `deploy/vps/`.
- Local verification gate is `npm run verify`.

## Verification

Latest local baseline before OSS polish:

- `npm run lint`: passes with existing warnings
- `npm run typecheck`: passes
- `npm run build`: passes

Known warning categories:

- React Fast Refresh warnings in shared UI/component modules
- React hook dependency warnings in canvas effects
- Large wallet/vendor bundles from wallet integration dependencies

These warnings existed before the OSS application polish and are not blockers for the application-prep pass.

## Maintainer Notes

- Keep real `.env`, `.env.local`, production env files, SQLite data, uploads, and logs out of Git.
- Keep public docs generic: use placeholders for private hosts, wallets, and deployment credentials.
- Use `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, and `ROADMAP.md` as the public maintainer surface.
