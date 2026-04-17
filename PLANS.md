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

