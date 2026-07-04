# Mafia Wars

Premium online social-deduction multiplayer game.

**Stack:** Next.js 15 · TypeScript · Firebase (Auth + Firestore) · Vercel · LiveKit (optional voice)

**Live:** https://mafia-wars-mfd1.vercel.app

---

## Quick start

```bash
npm install
cp .env.example .env.local
# fill Firebase keys
npm run dev
```

Open http://localhost:3000

### Required Firebase setup

1. Enable **Anonymous** authentication (and optionally **Google**)
2. Create a **Firestore** database
3. Publish rules from `firestore.rules`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) |
| `npm run format` | Prettier |

---

## Folder structure

```
app/                  Next.js App Router + API routes
components/
  ui/                 Design system (Button, Card, Badge, …)
  game/               Game screens (presentation only)
constants/            Roles, settings, narrator lines
game-engine/          Pure game logic (no React)
hooks/                React hooks (session, voice, immersion)
services/
  firebase/           Auth + client
  rooms/              Room/player/vote/log services
  media/              LiveKit voice layer
  audio/              Sound + narrator
  stats/              Statistics + achievements framework
store/                Zustand UI store (toasts, online)
types/                Shared TypeScript types
lib/                  Errors, logger, analytics, session storage
i18n/                 Translation files
styles/               Design tokens
docs/                 Architecture notes
```

**Rule:** React components must not contain complex Firestore or game-resolution logic. Use `services/` and `game-engine/`.

---

## Firestore schema

| Path | Responsibility |
|------|----------------|
| `rooms/{roomId}` | Metadata, settings, host, status |
| `rooms/{id}/players/{uid}` | Public player fields (no roles) |
| `rooms/{id}/secrets/{uid}` | Role + private logs (host + owner only) |
| `rooms/{id}/state/current` | Phase, timers, winner |
| `rooms/{id}/votes/{uid}` | Confirmed votes |
| `rooms/{id}/nightActions/{uid}` | Night targets |
| `rooms/{id}/logs` | Public timeline |
| `rooms/{id}/hostLogs` | Full host timeline |
| `matchHistory/{id}` | Finished match summary |
| `statistics/{uid}` | Player career stats |
| `roomCodes/{code}` | Code → roomId index |

---

## Game flow

```
waiting → role_reveal → night → morning → discussion → voting → elimination
                                                              ↓
                                                         win check
                                                              ↓
                                              night (next round) or finished
```

- **Host** is Game Master only (never receives a role).
- **Auto Mode** advances phases from shared timer (`timerStartedAt` + `timerDurationMs`).
- Clients compute remaining time locally.

---

## Environment variables

See `.env.example`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_FIREBASE_*` | Yes | Firebase web config |
| `NEXT_PUBLIC_LIVEKIT_URL` | No | LiveKit WebSocket URL |
| `LIVEKIT_API_KEY` | No | LiveKit token signing |
| `LIVEKIT_API_SECRET` | No | LiveKit token signing |

Never commit `.env.local`.

---

## Security model

Players may update only their own limited fields (ready, hand, mic, notes, …).

Host may start/pause/kick/settings/timers/phase writes.

Roles live in `secrets/` — readable only by owner and host.

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR:

Lint → Typecheck → Test → Build

Vercel deploys from `main` automatically.

---

## Testing

```bash
npm test
```

Unit tests cover role generation, win conditions, and vote tallying.

---

## Future roadmap

- Public matchmaking, friends/parties
- Ranked ELO, seasonal progression
- Full LiveKit video grid UI
- Streaming mode / PWA
- Email, Discord, Steam, Apple auth providers
- E2E tests (Playwright)

Architecture is modular so these can land without rewrites.

---

## Contributing

1. Branch from `main`
2. Keep UI free of business logic
3. Add/adjust unit tests for engine changes
4. Run `npm run lint && npm run typecheck && npm test && npm run build`
5. Open a PR

See `docs/ARCHITECTURE.md` for deeper design notes.
