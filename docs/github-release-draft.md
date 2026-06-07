# Release Draft: next OSS maintenance release

Title:

```text
MonadFish - OSS maintenance update
```

Body:

```markdown
## Highlights

- Documents MonadFish as an MIT-licensed open-source browser game.
- Adds a clean README with local setup, verification, deployment, and security notes.
- Adds maintainer files: CONTRIBUTING, SECURITY, ROADMAP, and issue templates.
- Keeps the existing React/Vite game client, Node API, leaderboard persistence, and VPS deployment path intact.
- Fixes the production bundle bootstrap by removing fragile manual chunk splitting.
- Adds README demo media captured from the production UI.
- Documents wallet/reward configuration with placeholder-only examples.
- Prevents stale HTML caching on the VPS path so direct visitors do not get stuck on old asset hashes.

## Verification

- npm run verify
- npm run verify:ci
- GitHub Actions passing on main
- Fresh production browser load reached the game interface with 0 console errors

## Notes

This release establishes the public OSS baseline for future issues, pull requests, and maintainer workflows while keeping the production game runtime working.
```
