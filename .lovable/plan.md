

## Plan: Anti-bot protection for fishing mechanics

### Overview

Add two anti-bot mechanisms:
1. **Cast protection** — random "hold to cast" mechanic with a power bar that requires human timing
2. **Bite reaction** — when a fish bites (`catching` state), the player must tap/click a button within a short time window to reel it in; failure = fish escapes

### Technical Details

#### 1. New GameState: `'biting'`

Add a new state between `waiting` and `catching` in `src/types/game.ts`. When the fish bites, the game enters `biting` state showing a reaction prompt. The player has 1.5–2.5 seconds (randomized) to tap "Reel!" — if they miss, the fish escapes.

**File: `src/types/game.ts`**
- Add `'biting'` to `GameState` type

#### 2. Update `useGameState.ts` — split catching flow

Modify `castRod`:
- After `waiting`, set state to `'biting'` instead of `'catching'`
- Store the caught fish in a ref but don't apply rewards yet
- Add a new `reelIn()` function that the player calls during `biting` state
- Add a timeout — if `reelIn()` isn't called within the window, the fish escapes (no rewards, still lose bait)
- Add a `castStartTime` ref and validate that casts aren't happening faster than humanly possible (minimum 4s between casts)

#### 3. Update `GameControls.tsx` — reaction button

- In `biting` state, show an animated "Reel! 🎣" button with a shrinking timer bar
- The button calls `reelIn()` from game state
- Add visual urgency (pulsing, countdown bar)

#### 4. Update `MonadFishCanvas.tsx`

- Handle the new `biting` state visually (bobber splashing animation)

#### 5. Update `FishingGame.tsx`

- Pass `reelIn` function through to `GameControls`
- Add bite sound for the `biting` state

### Anti-bot effectiveness

- **Variable timing**: random wait times + random reaction windows make automation harder
- **Required interaction**: fish is lost without active player input during bite
- **Rate limiting**: minimum interval between casts prevents rapid-fire automation
- **Human-like timing**: the reaction window (1.5–2.5s) is tuned for humans, not scripts

### Files to modify
- `src/types/game.ts` — add `'biting'` state
- `src/hooks/useGameState.ts` — split catch flow, add `reelIn()`, add cast rate limit
- `src/components/game/GameControls.tsx` — add reaction button UI for `biting` state
- `src/components/game/FishingGame.tsx` — wire `reelIn`, add sound
- `src/components/game/MonadFishCanvas.tsx` — handle `biting` state visually

