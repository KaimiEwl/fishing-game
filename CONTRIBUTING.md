# Contributing

Thanks for helping improve MonadFish. The project is a browser game and production-style app, so changes should keep the game playable on mobile and keep server-backed data flows safe.

## Before You Start

- Check `ROADMAP.md` for current priorities.
- Open an issue for larger changes before starting implementation.
- Keep secrets, local env files, SQLite data, uploads, and logs out of Git.

## Local Setup

```sh
npm ci
npm run server
npm run dev
```

Run the verification gate before opening a pull request:

```sh
npm run verify
```

## Pull Request Guidelines

- Keep gameplay, UI, API, and deploy changes separated when possible.
- Include screenshots or short notes for visible UI/gameplay changes.
- Explain any economy, rewards, leaderboard, or wallet behavior change clearly.
- Avoid committing generated build output, local logs, database files, or production env values.

## Project Areas

- `src/`: React game client
- `server/`: API and persistence
- `shared/`: shared economy/config modules
- `deploy/vps/`: optional full-runtime deploy assets
- `scripts/`: build, ops, QA, and deployment helpers

## Maintainer Review Checklist

- `npm run verify` passes
- no secrets or private host details are introduced
- mobile-first game flow still works
- wallet/reward changes are documented
- server persistence changes include restore/rollback notes when relevant
