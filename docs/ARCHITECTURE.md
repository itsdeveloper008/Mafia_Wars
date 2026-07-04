# Architecture

## Principles

1. **Firestore is source of truth** for multiplayer state.
2. **Game engine is pure** — no React, no UI imports.
3. **Services own I/O** — Firebase, LiveKit, audio.
4. **Hooks compose services** for screens.
5. **Screens are presentation** — props in, events out.

## Game engine

| Module | Responsibility |
|--------|----------------|
| `RoleManager` | Balanced role decks |
| `VoteManager` | Abstain fill + tally + ties |
| `ActionResolver` | Night priority resolution |
| `WinManager` | Town / Mafia / Jester wins |
| `TimerManager` | Duration + expiry math |
| `PhaseManager` | Phase graph |
| `GameEngine` | Batched writes for start / advance / finish |

Host client (auto mode) is the single writer for phase transitions. All clients subscribe.

## Session recovery

`lib/sessionStorage.ts` stores `activeRoomId`. On load:

1. Anonymous (or Google) auth restores `uid`
2. Room is loaded if host or existing player
3. Player marked `isConnected: true`

## Media

`VoiceRoom` prefers LiveKit when `/api/livekit/token` succeeds; otherwise local mic metering for speaking indicators.

## UI state

Zustand (`store/uiStore.ts`) holds toasts and online status only. Game state stays in Firestore.

## Extending roles

1. Add role to `types/game.ts`
2. Update `RoleManager.generateRoles`
3. Update `ActionResolver` if night action needed
4. Add `ROLE_INFO` + narrator lines

## Extending auth

`services/firebase/auth.ts` exposes `ensureAuthUser` and `signInWithGoogle`. Add providers beside Google without changing room services (they only need `uid`).
