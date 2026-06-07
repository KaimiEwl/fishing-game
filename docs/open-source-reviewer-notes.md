# Open Source Reviewer Notes

These notes summarize why MonadFish is a reasonable candidate for maintainer tooling support without requiring reviewers to inspect private infrastructure or secrets.

## Project Summary

MonadFish is an open-source, mobile-first browser fishing game built with React, Vite, TypeScript, a small Node API, and SQLite-backed runtime persistence. It includes a production-style reward loop, map progression, upgrades, tasks, leaderboard persistence, and optional wallet/reward configuration.

Public links:

- Repository: https://github.com/KaimiEwl/fishing-game
- Production app: https://www.hookloot.xyz
- GitHub Pages build: https://kaimiewl.github.io/fishing-game/
- Release history: https://github.com/KaimiEwl/fishing-game/releases
- GitHub Actions: https://github.com/KaimiEwl/fishing-game/actions

## Why It Qualifies

OpenAI's Codex for OSS program asks for evidence of usage, ecosystem importance, and active maintenance. MonadFish is strongest on active maintenance and reusable implementation value:

- it is a real deployed browser game, not a disposable demo
- it documents both static GitHub Pages deployment and full server-backed VPS operation
- it includes reusable patterns for mobile game UI, API-backed progression, leaderboard persistence, and wallet/reward configuration
- it maintains public verification, security, contribution, release, and roadmap documentation
- it has a public CI workflow that runs linting, type checks, and production builds

## Current Adoption Signal

The project is early-stage, so stars, forks, and package-download metrics may be limited. The application should be honest about that and focus on the public production deployment, active maintenance work, and reusable value for small teams building browser games with server persistence and optional wallet integrations.

## Maintainer Evidence

- `MAINTAINERS.md` identifies `KaimiEwl` as primary maintainer.
- `.github/CODEOWNERS` routes repository changes to `@KaimiEwl`.
- `CONTRIBUTING.md` documents contribution and review expectations.
- `SECURITY.md` documents private handling for security-sensitive reward, wallet, leaderboard, and persistence issues.
- `ROADMAP.md` and public issues show planned maintenance work.

## Suggested Application Positioning

Use the application text to present MonadFish as an active, production-style OSS game template with concrete maintainer workload:

- reviewing gameplay and UI changes without breaking mobile playability
- triaging API, leaderboard, wallet, reward, and persistence changes
- maintaining release notes, CI, deployment docs, and operational checks
- using Codex for code review, regression detection, doc maintenance, issue triage, and release workflow automation

## Safe Boundaries

Do not submit private infrastructure details, server secrets, local backup paths, real tokens, wallet private keys, or non-public production data in the OpenAI form. The public repository and production URL are enough for the initial submission.
