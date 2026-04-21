# MonadFish Release Notes

## Project-specific release setup

- Active app repo: `bright-greet-forge-main`
- Runtime used in CI: Node `20` (`.github/workflows/deploy.yml`)
- Package manager used in CI: `npm`
- Auto deploy target: GitHub Pages on push to `main`

## Local install

```sh
npm ci
```

## Required env vars

Copy `.env.example` and provide:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

Optional:

- `VITE_WALLETCONNECT_PROJECT_ID`

## Local release build for GitHub Pages

This produces the same style of artifact as CI, including SPA fallback `dist/404.html`:

```sh
npm run build:pages
```

If the repository name changes, override the base path.

PowerShell:

```sh
$env:PAGES_REPO_NAME="<new-repo-name>"; npm run build:pages
```

Bash:

```sh
PAGES_REPO_NAME=<new-repo-name> npm run build:pages
```

## Release preflight

```sh
npm run build
npm run build:pages
```

Notes:

- `npm run lint` currently fails because of pre-existing repo-wide ESLint debt.
- No automated test script is present in `package.json`.

## Deployment

- CI workflow: `.github/workflows/deploy.yml`
- Trigger: push to `main`
- CI injects `VITE_BASE_PATH=/<repo-name>/` and publishes `dist/` to GitHub Pages

## VPS deployment

- New VPS deploy assets now live under `deploy/vps/`
- Step-by-step guide:
  - `docs/vps-deploy.md`
- Local helpers:
  - `npm run vps:install`
  - `npm run vps:add-remote`

## Customer handoff note

For customer delivery, include the deployed GitHub Pages URL and the backup zip created before release work.

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
