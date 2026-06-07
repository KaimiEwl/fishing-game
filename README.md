# MonadFish

MonadFish is a mobile-friendly browser fishing game with a reward loop, map progression, upgrades, tasks, leaderboard persistence, and an optional wallet-enabled economy. The repository is an open-source React/Vite game app plus a small Node API for server-side player data.

Live links:

- Production: https://www.hookloot.xyz
- GitHub Pages build: https://kaimiewl.github.io/fishing-game/
- Repository: https://github.com/KaimiEwl/fishing-game

## Features

- Arcade fishing loop with bait, rods, fish rarity, maps, and upgrades
- Mobile-first React UI with game, shop, map, tasks, wheel, grill, and leaderboard screens
- Server-backed player records and leaderboard persistence
- Optional wallet/reward flow using Wagmi, Viem, RainbowKit, and Monad-compatible configuration
- Vite production build with manual vendor chunks for large wallet and UI dependencies
- GitHub Pages CI build plus an owned VPS deployment path for the full API-backed runtime
- Local smoke and ops scripts for API, rewards, progress, and weekly checks

## Tech Stack

- React 18, TypeScript, Vite
- Tailwind CSS and Radix UI primitives
- Node.js API with SQLite-backed runtime data
- Wagmi, Viem, RainbowKit for wallet integration
- GitHub Actions for Pages deployment
- Docker/nginx assets for the VPS deployment path

## Repository Layout

```text
src/             React game client
server/          Node API and runtime persistence
shared/          Shared economy/config modules
public/          Static assets and game media
deploy/vps/      VPS compose, nginx, ingress, and server deploy scripts
scripts/         Build, ops, VPS, QA, and automation helpers
docs/            Deployment, release, and operating notes
```

## Local Development

Install dependencies:

```sh
npm ci
```

Start the API:

```sh
npm run server
```

Start the Vite dev server in another terminal:

```sh
npm run dev
```

During local development, Vite proxies `/api/*` to `http://127.0.0.1:8787` unless `VITE_API_PROXY_TARGET` is set.

## Environment

Copy `.env.example` to `.env` and fill only the values needed for your runtime.

Required for the full API/runtime path:

- `HOOKLOOT_SESSION_SECRET` or `SESSION_TOKEN_SECRET`
- `HOOKLOOT_RECEIVER_ADDRESS`
- `HOOKLOOT_ADMIN_WALLETS`

Optional:

- `VITE_WALLETCONNECT_PROJECT_ID`
- `VITE_API_PROXY_TARGET`
- `MONAD_RPC_URL`

Do not commit `.env`, `.env.local`, database files, logs, or production secrets.

## Verification

Run the main local pre-merge gate:

```sh
npm run verify
```

This currently runs:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

For the GitHub Pages artifact path:

```sh
npm run verify:ci
```

## Deployment

GitHub Pages uses `.github/workflows/deploy.yml`. On pushes to `main`, CI installs dependencies, runs `npm run verify:ci`, and publishes `dist/`.

The full server-backed runtime is documented in `docs/vps-deploy.md`. That path runs the web app and API together, keeps SQLite data on the server, and archives data before deploy switches.

## Open Source Status

MonadFish is maintained as an open-source browser game template and production-style game app. The codebase is useful for small teams building mobile web games with:

- a React/Vite client
- an API-backed leaderboard
- server-side player persistence
- deploy scripts for GitHub Pages and an owned VPS
- wallet/reward integration patterns

## Contributing

Issues and pull requests are welcome. Start with `CONTRIBUTING.md` and `ROADMAP.md` for the current project direction.

Before opening a pull request, run:

```sh
npm run verify
```

## Security

Please do not open public issues for secrets, production data exposure, or exploitable reward/leaderboard bugs. See `SECURITY.md` for the preferred reporting path.

## License

MIT. See `LICENSE`.
