# OSS Application Readiness Report

Date: 2026-06-07

Branch:

```text
oss-application-polish
```

Prepared commit:

```text
b77f0f9 Prepare fishing game OSS application polish
```

Current published GitHub main also includes:

```text
0b9292c Add OSS application readiness report
4f953dc Fix production bundle bootstrap
038adc9 Bump OSS baseline release version
6489777 Add gameplay screenshot to README
5d25252 Record published OSS application assets
cf93060 Add OpenAI OSS submission packet
b02770f Fix economy config lint type
fa4d0eb Prevent stale HTML caching on VPS
```

## Completed

- Created a safe OSS preparation branch.
- Added MIT license.
- Replaced the generated/template README with a public open-source README.
- Added CONTRIBUTING, SECURITY, ROADMAP, and GitHub issue templates.
- Added release, issue, and OpenAI Codex for OSS application drafts under `docs/`.
- Removed tracked generator artifacts: `.lovable/plan.md` and `bun.lockb`.
- Removed `lovable-tagger` from Vite config and package metadata.
- Updated package metadata to `monadfish@0.1.1` with repository, homepage, description, and MIT license.
- Sanitized public env/deploy docs with placeholders instead of private host/key defaults.
- Kept gameplay/runtime source changes out of the OSS-polish commit.
- Fixed the production bundle bootstrap by removing fragile manual chunk splitting from Vite.
- Verified the live production site after the bundle fix.
- Added a public README gameplay screenshot under `docs/assets/`.
- Published GitHub release `v0.1.1`.
- Created four public roadmap issues.
- Fixed the CI lint failure in `src/lib/economyConfig.ts`.
- Added no-store caching for SPA HTML on the VPS nginx path so direct visitors do not get stuck on stale asset hashes.
- Re-applied security headers in nginx locations that define custom cache headers.

## Verification

These checks passed after the OSS polish:

```sh
npm run verify
npm run verify:ci
```

Latest GitHub Actions check:

```text
https://github.com/KaimiEwl/fishing-game/actions/runs/27099662956
```

Known remaining warnings:

- existing React Fast Refresh warnings in shared component modules
- existing React hook dependency warnings in canvas effects
- large wallet/vendor chunk warnings from wallet integration dependencies
- npm audit reports dependency vulnerabilities; this was not fixed in the OSS-polish pass because automated audit fixes may introduce breaking dependency changes

## Production Runtime Status

Checked on 2026-06-07 after the static frontend recovery:

- `https://www.hookloot.xyz/` returns the updated production HTML.
- The live HTML references `assets/index-C2PDekYF.js` and no longer references the old `vendor-ui-Buf4l4Ka.js` entry from the broken split-chunk build.
- `https://www.hookloot.xyz/api/healthz` returns `ok`.
- A fresh browser load reached the game interface and reported 0 console errors.
- `https://www.hookloot.xyz/` and `https://www.hookloot.xyz/index.html` return `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`.
- The root HTML keeps `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` after the cache fix.

Emergency static backup made before recovery:

```text
C:\OPENAI_OSS_BACKUPS\hookloot-current-dist_20260607_085605
```

## Public Risk Checks

The staged OSS-polish commit was checked for:

- Lovable boilerplate
- placeholder project IDs
- customer handoff / backup zip language
- private VPS alias
- local private key path
- crude test nickname

No matching staged public-risk strings were found after cleanup.

## Not Included In The OSS-Polish Commit

These pre-existing working-tree changes remain outside the commit:

- `public/assets/pepe_final.png`
- `crop.py`
- `docs/social-quest-roadmap.md`
- `public/qa-runner.html`
- `scripts/marketing/`
- `scripts/qa/`

They were left untouched to avoid mixing unrelated gameplay/assets/QA work with the OSS application-prep commit.

## GitHub Preparation

Ready local materials:

- `docs/github-release-draft.md`
- `docs/github-issue-drafts.md`
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`

Recommended public GitHub steps after pushing/merging:

- keep release `v0.1.1` visible
- keep 3-4 public roadmap issues open and maintain them as work progresses
- confirm GitHub detects the MIT license

Current public GitHub signals checked on 2026-06-07:

- repository is public
- default branch is `main`
- GitHub detects MIT license
- release `v0.1.1` is public
- four public roadmap issues are open
- current public adoption is still weak: 0 stars, 0 forks

Application implication:

- The project can be submitted honestly as an active open-source project maintained by the owner.
- Acceptance risk is meaningful because the program explicitly looks for meaningful usage, broad adoption, or clear ecosystem importance.
- The best remaining low-risk improvement before submitting is to add more public adoption/community signals, but the core OSS hygiene work is complete.

## OpenAI Application Preparation

Ready local materials:

- `docs/openai-codex-oss-application.md`

The form still requires account-owner-only fields:

- first name
- last name
- ChatGPT account email
- OpenAI Organization ID
