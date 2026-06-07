# Maintainers

MonadFish is currently maintained by the repository owner.

## Primary Maintainer

- GitHub: [@KaimiEwl](https://github.com/KaimiEwl)
- Role: primary maintainer and project owner
- Scope: gameplay direction, React client, Node API, wallet/reward configuration, release decisions, production deployment path, and security triage

## Maintainer Responsibilities

The primary maintainer is responsible for:

- reviewing pull requests and public issues
- keeping the game playable on mobile before accepting changes
- maintaining the GitHub Pages build and production runtime deployment notes
- triaging leaderboard, reward, wallet, and persistence risks before normal feature work
- keeping public documentation free of secrets and private infrastructure details
- publishing releases and roadmap updates when meaningful changes land

## Review And Release Flow

- Contributors should open issues for large changes before implementation.
- Pull requests should pass `npm run verify` before review.
- Gameplay or UI changes should include screenshots or short notes.
- Reward, wallet, leaderboard, or persistence changes should include rollback notes.
- Security-sensitive reports should follow `SECURITY.md` instead of public exploit details.

## OpenAI OSS Reviewer Notes

The OpenAI Codex for OSS submission should identify `KaimiEwl` as the primary maintainer for `https://github.com/KaimiEwl/fishing-game`.

Useful public evidence:

- public repository: https://github.com/KaimiEwl/fishing-game
- production app: https://www.hookloot.xyz
- GitHub Pages build: https://kaimiewl.github.io/fishing-game/
- release history: https://github.com/KaimiEwl/fishing-game/releases
- roadmap/issues: https://github.com/KaimiEwl/fishing-game/issues
- CI workflow: https://github.com/KaimiEwl/fishing-game/actions
