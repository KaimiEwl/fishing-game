# PLANS

## Current objective
Implement and stabilize a playable fishing vertical slice on desktop and mobile:
- cast -> bite -> hook/reel -> reward
- inventory and progression update correctly
- main screen UI remains usable and visually coherent

## Definition of done
- Project builds successfully
- Main loop works end-to-end
- No broken existing screens
- `STATUS.md` clearly explains what changed and what remains

## Milestone 1
Main fishing screen stability and UX cleanup:
- compact/expandable player panel on both desktop and mobile
- restore bottom navigation in the intended location
- remove stray contact CTA from the main scene
- tighten travel button sizing/placement
- fix cast/reel button behavior so hover does not imply a state change
- clean up water/sky readability issues on the lake scene

## Milestone 2
Core loop validation:
- verify cast -> wait -> bite -> reel flow
- verify rewards, XP, and inventory updates
- reduce confusing duplicate prompts during bite/reel states

## Milestone 3
Regression sweep:
- shop/tasks/grill/map/leaderboard still render correctly
- mobile and desktop layouts stay usable
- document remaining issues and next steps

## Three-stage task: Server-authoritative progress and task claims

### Stage 1
Stabilize task claims without breaking live progress:
- introduce a server-authoritative claim path for daily, weekly, and special tasks
- keep the current `game_progress` blob as a compatibility layer during rollout
- move readiness and reward issuance to one server-side operation instead of `save -> claim`
- add idempotent claim protection keyed by player, task, and day/week scope
- success criteria:
  - `Ready -> Claim reward` no longer depends on a separate sync race
  - guest -> wallet transition still preserves visible task progress
  - current UI can keep reading existing task state during rollout

### Stage 2
Move inventory-sensitive actions to atomic server flows:
- migrate catch resolution, grill cooking, and other reward-critical inventory changes to server-authoritative operations
- ensure inventory, cooked dishes, and related task progress update in one transaction
- keep the client responsible only for pending UI state and optimistic feedback
- success criteria:
  - no more `fish exists in UI but server says not enough fish`
  - grill, catch rewards, and related task increments use one source of truth
  - wallet-linked users do not lose effective progress when switching from guest state

### Stage 3
Switch read paths and reduce duplicated client state:
- introduce normalized progress reads for tasks, inventory, and claims from the new server-backed model
- reduce `game_progress` to a compatibility snapshot or cache instead of the primary authority
- remove old retry/sync guards that only exist to patch client/server drift
- success criteria:
  - task UI, grill UI, and reward UI read from stable server-backed state
  - duplicated local-vs-wallet progress logic is minimized
  - old race-condition glue code can be safely deleted without regressions
