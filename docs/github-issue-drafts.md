# GitHub Roadmap Issue References

These were used as the first public roadmap issues after the OSS polish landed. Keep the public issues open while follow-up work continues, and close them when the remaining scope is finished.

## Issue 1

Public issue:

```text
https://github.com/KaimiEwl/fishing-game/issues/1
```

Title:

```text
Add gameplay screenshots and short demo capture to README
```

Body:

```markdown
Add a small screenshot set or short demo capture showing the fishing loop, map, shop, tasks, and leaderboard. Keep media lightweight and avoid production-only data.
```

Current status:

```text
README now includes one mobile gameplay screenshot and one short mobile demo capture. Keep the issue open only if more screen coverage is desired.
```

Labels:

```text
documentation, enhancement
```

## Issue 2

Public issue:

```text
https://github.com/KaimiEwl/fishing-game/issues/2
```

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

Public issue:

```text
https://github.com/KaimiEwl/fishing-game/issues/3
```

Title:

```text
Document wallet and reward configuration with placeholder-only examples
```

Body:

```markdown
Create a focused docs page for wallet/reward env setup. Use placeholders only, explain which values are public client config vs server-only secrets, and link to SECURITY.md.
```

Current status:

```text
docs/wallet-reward-configuration.md now covers the first placeholder-only configuration pass. Keep the issue open only if more wallet/provider examples are needed.
```

Labels:

```text
documentation, security
```

## Issue 4

Public issue:

```text
https://github.com/KaimiEwl/fishing-game/issues/4
```

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
