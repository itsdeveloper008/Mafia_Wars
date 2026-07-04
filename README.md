# Mafia Wars

Party social-deduction game built with **Next.js 15**, React, and TypeScript.

## Scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
npm run lint
```

## Project structure

```
app/                  # Next.js App Router
  layout.tsx          # Root layout, fonts, metadata
  page.tsx            # Home page
  globals.css         # Global styles
components/
  MafiaWarsApp.tsx    # Full game UI (client component)
  MafiaWarsApp.css    # Game styles
lib/
  firebase.ts         # Firestore client (NEXT_PUBLIC_* env vars)
public/
  images/             # Game art
  favicon.png
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in Firebase values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

On Vercel, add the same names under Project → Settings → Environment Variables.
