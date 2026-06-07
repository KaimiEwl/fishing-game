# VPS Deployment Guide

This guide documents the optional full-runtime deployment path for MonadFish. GitHub Pages can host the static client, but the full game runtime expects the web app, API, and SQLite data directory to live on an owned server.

Use placeholders in public docs:

- SSH host alias: `<vps-host>` or `hookloot-vps`
- Root directory: `/opt/hookloot`
- Git remote: `<vps-host>:/opt/hookloot/repo.git`
- Production env: `/opt/hookloot/.env.production`

## What The VPS Stack Runs

- `hookloot-api`: Node API container with SQLite data mounted from `/opt/hookloot/data`
- `hookloot-web`: nginx container serving the production `dist/` build
- isolated compose project bound to `127.0.0.1:18181`
- optional host-level ingress for `hookloot.xyz` / `www.hookloot.xyz`

## Repository Assets

- `deploy/vps/compose.yml`: API and web containers
- `deploy/vps/nginx/default.conf`: SPA routing and same-origin `/api/*` proxy
- `deploy/vps/server/*`: bootstrap, deploy hook, healthcheck, release pruning
- `deploy/vps/ingress/*`: nginx and Caddy ingress templates
- `scripts/vps/*`: local helpers for installing, syncing env, and adding remotes

## Production Env

Create or fill:

```text
/opt/hookloot/.env.production
```

Required values:

```env
VITE_BASE_PATH=/
VITE_WALLETCONNECT_PROJECT_ID=<walletconnect-project-id>
HOOKLOOT_SESSION_SECRET=<long-random-secret>
HOOKLOOT_RECEIVER_ADDRESS=<receiver-wallet-address>
HOOKLOOT_ADMIN_WALLETS=<admin-wallet-addresses>
MONAD_RPC_URL=<rpc-url>
```

Never commit production env files, wallet secrets, database files, uploads, or logs.

## Local SSH Setup

Create a local SSH alias such as:

```sshconfig
Host hookloot-vps
  HostName <server-ip-or-hostname>
  User <ssh-user>
  IdentityFile <path-to-private-key>
  IdentitiesOnly yes
```

The helper scripts default to `hookloot-vps`. You can also pass `-SshHost` directly or set `HOOKLOOT_SSH_KEY` for scripts that need a private key path.

## One-Time Bootstrap

Run locally from the repo:

```powershell
npm run vps:install
```

This uploads the server bootstrap files, creates `/opt/hookloot`, initializes `/opt/hookloot/repo.git`, installs the deploy hook, and creates `/opt/hookloot/.env.production` if it is missing.

## Add Deploy Remote

Run locally:

```powershell
npm run vps:add-remote
```

Expected remote:

```text
vps  hookloot-vps:/opt/hookloot/repo.git
```

## Deploy

After filling `/opt/hookloot/.env.production`, deploy with:

```powershell
git push vps main
```

The VPS hook creates a timestamped release, builds with Node 20, archives data before switching releases, restarts only the game containers, runs smoke checks, and prunes old releases/backups.

## Mirror Normal Pushes

If this machine should update GitHub and the VPS on the same `git push origin main`, run:

```powershell
npm run vps:mirror-origin
```

This configures multiple `origin` push URLs. Use it only on machines that intentionally deploy to the production VPS.

## DNS And Ingress

Configure DNS for your domain to point at the VPS. Then wire host-level nginx/Caddy ingress to `127.0.0.1:18181`.

Templates:

- `deploy/vps/ingress/hookloot.nginx.conf`
- `deploy/vps/ingress/Caddyfile`

## Restore Notes

The deploy hook archives `/opt/hookloot/data` before release switches. For manual recovery, stop the containers, restore `/opt/hookloot/data`, restore `.env.production` if needed, and redeploy from the Git remote.
