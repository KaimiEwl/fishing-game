# GitHub Issue Drafts

Use these as the first public roadmap issues after the OSS polish lands.

## Issue 1

Title:

```text
Add gameplay screenshots and short demo capture to README
```

Body:

```markdown
Add a small screenshot set or short demo capture showing the fishing loop, map, shop, tasks, and leaderboard. Keep media lightweight and avoid production-only data.
```

Labels:

```text
documentation, enhancement
```

## Issue 2

Title:

```text
Add focused smoke tests for leaderboard and player progress
```

Body:

```markdown
Add repeatable smoke checks for server-backed leaderboard persistence and player progress recovery. The goal is to make deploy confidence easier without requiring production data.
```

Labels:

```text
testing, server
```

## Issue 3

Title:

```text
Document wallet and reward configuration with placeholder-only examples
```

Body:

```markdown
Create a focused docs page for wallet/reward env setup. Use placeholders only, explain which values are public client config vs server-only secrets, and link to SECURITY.md.
```

Labels:

```text
documentation, security
```

## Issue 4

Title:

```text
Improve mobile reconnect and API failure feedback
```

Body:

```markdown
Review the mobile player flow when the API is unavailable, slow, or reconnecting. Add clearer feedback for leaderboard, rewards, and progress sync states.
```

Labels:

```text
mobile, UX
```
