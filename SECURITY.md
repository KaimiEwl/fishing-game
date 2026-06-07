# Security Policy

MonadFish includes optional wallet/reward flows, leaderboard persistence, and server-side player data. Please report security issues carefully.

## Supported Version

The maintained branch is `main`.

## Reporting A Vulnerability

Please do not disclose exploitable details in a public issue. Use GitHub private vulnerability reporting if it is enabled for the repository. If it is not available, open a minimal public issue that says a private security report is needed, without including exploit steps, secrets, wallet details, or production data.

Helpful report details:

- affected route, screen, script, or API endpoint
- expected impact
- reproduction outline without real secrets
- suggested fix, if known

## Sensitive Data

Do not commit:

- `.env`, `.env.local`, or `.env.production`
- wallet secrets or private keys
- SQLite databases, WAL/SHM files, uploads, or logs
- production host credentials
- real session tokens or API keys

## Maintainer Response

Security reports should be triaged before normal feature requests. Fixes that affect rewards, wallet flow, leaderboard writes, or server persistence should be verified with `npm run verify` and a focused smoke test.
