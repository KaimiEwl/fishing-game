# Hook & Loot VPS Deploy

## Goal
- Move the site off GitHub Pages onto `vm3661`
- Serve the game from `https://www.hookloot.xyz`
- Keep the current Supabase backend unchanged in stage 1
- Use a fully isolated Docker contour so existing `n8n` and `tailscale` stay untouched

## What this repo now contains
- `deploy/vps/compose.yml`
  - isolated `hookloot-web` nginx container
  - binds only `127.0.0.1:18181`
- `deploy/vps/nginx/default.conf`
  - SPA routing for `/`, `/admin`, `/guide`, `/terms`, `/privacy`
- `deploy/vps/server/*`
  - bootstrap
  - deploy hook
  - healthcheck
  - release pruning
- `deploy/vps/ingress/*`
  - ready nginx and Caddy templates for `hookloot.xyz` and `www.hookloot.xyz`
- `scripts/vps/install-hookloot-vps.ps1`
  - uploads bootstrap files to `vm3661`
- `scripts/vps/add-vps-remote.ps1`
  - adds or updates git remote `vps`
- `scripts/vps/sync-hookloot-env.ps1`
  - copies the current public frontend env to `/opt/hookloot/.env.production`
- `scripts/vps/enable-origin-vps-push.ps1`
  - makes `git push origin main` push to both GitHub and the VPS bare repo

## Production env on VPS
Create or fill:

`/opt/hookloot/.env.production`

Required values:

```env
VITE_BASE_PATH=/
VITE_SUPABASE_URL=https://oyhyoqnhqifcwjyputif.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<current anon key>
VITE_WALLETCONNECT_PROJECT_ID=<current project id or the fallback from src/lib/wagmi.ts>
```

To sync the current local public env to the VPS:

```powershell
npm run vps:sync-env
```

## One-time VPS bootstrap
Run locally from the repo:

```powershell
npm run vps:install
```

This will:
- create `/opt/hookloot`
- initialize `/opt/hookloot/repo.git`
- install the bare-repo `post-receive` hook
- install deploy scripts into `/opt/hookloot/bin`
- create `/opt/hookloot/.env.production` if missing

## Add deploy remote
Run locally:

```powershell
npm run vps:add-remote
```

Expected remote:

```text
vps  vm3661:/opt/hookloot/repo.git
```

## Mirror normal pushes to the VPS
If this machine should update the VPS every time you run `git push origin main`, enable a second push URL on `origin`:

```powershell
npm run vps:mirror-origin
```

After that, `git push origin main` will push to:
- the normal GitHub origin
- `vm3661:/opt/hookloot/repo.git`

## First deploy
After filling `/opt/hookloot/.env.production`, deploy with:

```powershell
git push vps main
```

The VPS hook will:
1. create a new release under `/opt/hookloot/releases`
2. run `npm ci && npm run build` inside `node:20-bookworm`
3. switch `/opt/hookloot/current`
4. restart `hookloot-web`
5. run smoke checks
6. keep only the latest releases

## DNS
In Namecheap:
- remove the existing redirect
- add `A` record for `@` -> public IP of `vm3661`
- add `A` record for `www` -> same IP
- TTL `300`

## Ingress
Use the existing VPS ingress if present.

Available templates:
- nginx: `deploy/vps/ingress/hookloot.nginx.conf`
- caddy: `deploy/vps/ingress/hookloot.caddy`

Canonical host:
- `https://www.hookloot.xyz`

Redirects:
- `hookloot.xyz` -> `https://www.hookloot.xyz`
- `http://www.hookloot.xyz` -> `https://www.hookloot.xyz`

## Notes
- GitHub Pages can stay temporarily as fallback for 1-2 days after cutover.
- Stage 1 does not move Supabase backend onto the VPS.
- If deploy scripts change later, rerun `npm run vps:install` to refresh `/opt/hookloot/bin` and the bare-repo hook.
