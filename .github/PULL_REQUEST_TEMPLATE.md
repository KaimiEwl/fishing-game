# Pull Request Checklist

## Summary

- What changed?
- Why is this needed?

## Safety Checks

- [ ] I ran `npm run verify` locally, or explained why I could not.
- [ ] I did not commit `.env`, database files, logs, uploads, private host details, tokens, keys, or wallet secrets.
- [ ] I kept gameplay, UI, API, and deployment changes separated where possible.
- [ ] I added screenshots or notes for visible gameplay/UI changes.
- [ ] I documented reward, wallet, leaderboard, or persistence behavior changes.
- [ ] I included rollback or restore notes for server persistence/deployment changes.

## Maintainer Notes

- Risk level: low / medium / high
- Areas touched: client / server / shared config / assets / docs / deploy
- Follow-up issue needed: yes / no
