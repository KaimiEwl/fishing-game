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

## Completed

- Created a safe OSS preparation branch.
- Added MIT license.
- Replaced the generated/template README with a public open-source README.
- Added CONTRIBUTING, SECURITY, ROADMAP, and GitHub issue templates.
- Added release, issue, and OpenAI Codex for OSS application drafts under `docs/`.
- Removed tracked generator artifacts: `.lovable/plan.md` and `bun.lockb`.
- Removed `lovable-tagger` from Vite config and package metadata.
- Updated package metadata to `monadfish@0.1.0` with repository, homepage, description, and MIT license.
- Sanitized public env/deploy docs with placeholders instead of private host/key defaults.
- Kept gameplay/runtime source changes out of the OSS-polish commit.

## Verification

These checks passed after the OSS polish:

```sh
npm run verify
npm run verify:ci
```

Known remaining warnings:

- existing React Fast Refresh warnings in shared component modules
- existing React hook dependency warnings in canvas effects
- large wallet/vendor chunk warnings from wallet integration dependencies
- npm audit reports dependency vulnerabilities; this was not fixed in the OSS-polish pass because automated audit fixes may introduce breaking dependency changes

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
- `src/lib/economyConfig.ts`
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

- create release `v0.1.0`
- create 3-4 public roadmap issues from `docs/github-issue-drafts.md`
- confirm GitHub detects the MIT license

## OpenAI Application Preparation

Ready local materials:

- `docs/openai-codex-oss-application.md`

The form still requires account-owner-only fields:

- first name
- last name
- ChatGPT account email
- OpenAI Organization ID
