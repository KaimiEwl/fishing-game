# Release Draft: v0.1.1

Title:

```text
MonadFish v0.1.1 - open-source baseline and production bundle fix
```

Body:

```markdown
## Highlights

- Documents MonadFish as an MIT-licensed open-source browser game.
- Adds a clean README with local setup, verification, deployment, and security notes.
- Adds maintainer files: CONTRIBUTING, SECURITY, ROADMAP, and issue templates.
- Keeps the existing React/Vite game client, Node API, leaderboard persistence, and VPS deployment path intact.
- Fixes the production bundle bootstrap by removing fragile manual chunk splitting.

## Verification

- npm run verify
- Fresh production browser load reached the game interface with 0 console errors

## Notes

This release establishes the public OSS baseline for future issues, pull requests, and maintainer workflows while keeping the production game runtime working.
```
