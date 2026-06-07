# OpenAI Codex For OSS Submission Packet

Date prepared: 2026-06-07

Form:

```text
https://openai.com/form/codex-for-oss/
```

## Project Fields

GitHub username:

```text
KaimiEwl
```

Repository URL:

```text
https://github.com/KaimiEwl/fishing-game
```

Production URL:

```text
https://www.hookloot.xyz
```

Maintainer role:

```text
Primary maintainer
```

## 500-Character Form Answers

Why does this repository qualify?

```text
MonadFish is an actively maintained open-source browser game template and production-style app. It demonstrates a reusable React/Vite game client, API-backed leaderboard persistence, mobile UX patterns, wallet/reward integration, CI verification, and an owned VPS deployment path for small web-game teams.
```

How will you use API credits for your project?

```text
API credits would support maintainer workflows for MonadFish: issue triage, Codex-assisted PR review, docs updates, release checklist generation, test/smoke-plan generation for leaderboard and player progress flows, and safer review of reward, wallet, and server persistence changes.
```

Anything else we should know?

```text
Live production app: https://www.hookloot.xyz. Public release v0.1.1, README demo media, and roadmap issues #1-#4 are public. The project is early, so I am not claiming broad adoption; I am applying as the primary maintainer of an active MIT-licensed OSS game template/runtime.
```

## Public Evidence

- Repository is public.
- GitHub detects MIT license.
- Release `v0.1.1` is public: `https://github.com/KaimiEwl/fishing-game/releases/tag/v0.1.1`
- GitHub Actions workflow is passing on `main`: `https://github.com/KaimiEwl/fishing-game/actions/workflows/deploy.yml`
- Roadmap issues are public:
  - `https://github.com/KaimiEwl/fishing-game/issues/1`
  - `https://github.com/KaimiEwl/fishing-game/issues/2`
  - `https://github.com/KaimiEwl/fishing-game/issues/3`
  - `https://github.com/KaimiEwl/fishing-game/issues/4`
- README includes a mobile gameplay screenshot and short demo capture.
- Production healthcheck returns `ok` at `https://www.hookloot.xyz/api/healthz`.
- Production root and `/index.html` return `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`, so direct visitors do not get stuck on stale HTML after asset hash changes.

## Owner-Only Fields

These must be filled by the account owner:

- first name
- last name
- ChatGPT account email
- OpenAI Organization ID from `https://platform.openai.com/organization`

## Country And Identity Notes

- The public form does not request a passport, selfie, or KYC document at submission time.
- The public form does not include a country field at submission time.
- Program terms say OpenAI may request additional information to verify identity, repository affiliation, maintainer status, or repository control.
- The applicant should use an OpenAI account from a supported country/region and must not use unsupported-region workarounds.
- Program benefits are personal, limited, non-transferable, and have no cash value.
- Do not submit confidential information in the form; application materials should be safe to review externally.
- OpenAI reviews applications on a rolling basis and notifies selected applicants by email.

## Honest Risk Note

The application is ready to submit, but acceptance is not guaranteed. The main weakness is adoption: the repository is early and currently has 0 stars and 0 forks. The submission should emphasize active maintenance, production reality, reusable OSS patterns, public release/issues, and maintainer workflow value without claiming broad adoption.
