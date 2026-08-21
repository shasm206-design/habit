# Habit Tracker — Next.js + Firebase PWA

Same feature set as the SwiftUI app, ported to a Next.js 14 (App Router) +
Tailwind + Firestore web app that deploys straight to Vercel.

## What's included
- 4 habit types: simple checkbox, repetitions, focus timer, counter (+unit)
- Real-time % completion per habit + an overall daily ring
- History tab: month calendar with a completion dot per day + day detail
- Daily notes with 600ms debounced autosave
- Over-achievement: values are never capped at the target (e.g. 21/20 → 105%)
- Firestore real-time listeners (`onSnapshot`) — a change on one device
  appears on another within seconds, no manual refresh
- Firestore offline persistence (IndexedDB) — works offline, syncs on reconnect

## 1. Firebase setup
1. Go to https://console.firebase.google.com → **Add project**.
2. Inside the project: **Build → Firestore Database → Create database**
   (start in test mode — you'll lock it down with `firestore.rules` below).
3. **Project settings → General → Your apps → Web (</>)** → register an app,
   copy the `firebaseConfig` values.
4. Copy `.env.local.example` to `.env.local` and fill in those values:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```
5. In the Firebase console, **Firestore → Rules**, paste the contents of
   `firestore.rules` from this project (it ships with a 30-day open rule so
   you can start immediately — read the comments inside for how to lock it
   down with Auth before sharing the app with anyone else).
6. No manual indexes are needed — every query filters on a single field
   (`date`), which Firestore indexes automatically.

## 2. Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000 — add a habit, then open the same URL on another
device/browser signed into the same Firestore project to see it sync live.

## 3. Deploy to Vercel
1. Push this project to a GitHub repo.
2. https://vercel.com → **Add New → Project** → import the repo.
3. In **Environment Variables**, add the same six `NEXT_PUBLIC_FIREBASE_*`
   values from your `.env.local`.
4. Deploy. Vercel auto-detects Next.js — no extra config needed.
5. In the Firebase console → **Authentication → Settings → Authorized
   domains**, add your Vercel domain (e.g. `your-app.vercel.app`) — required
   once you add Auth (see below); not required for the open test-mode rules.

## 4. PWA install
`public/manifest.json` is already wired up via `app/layout.tsx`. To make it
fully installable:
1. Add real `icon-192.png` and `icon-512.png` files to `public/icons/`
   (the manifest already references these paths).
2. Optionally add the `next-pwa` package for offline app-shell caching and a
   service worker: `npm i next-pwa` and wrap `next.config.mjs` per that
   package's docs. Firestore's own offline persistence (already enabled in
   `lib/firebase.ts`) covers your *data* offline regardless.

## 5. Adding real per-user Auth (recommended before sharing the app)
Right now all data is shared/open (single unauthenticated "workspace") to
match the single-user SwiftUI app. To make it multi-user:
1. Firebase console → **Authentication → Sign-in method** → enable a
   provider (Anonymous is enough to start, or Google/email for real login).
2. Sign the user in once on app load, e.g. in a `useEffect` in
   `app/layout.tsx` calling `signInAnonymously(auth)`.
3. Add `userId: auth.currentUser.uid` to every `addHabit` / `setLogValue` /
   `saveDayNote` call, and filter subscriptions with
   `where("userId", "==", uid)`.
4. Swap in the commented authenticated block in `firestore.rules`.

## Data model (Firestore)
```
habits/{habitId}
  name, icon, colorHex, type, targetValue, unit,
  sortOrder, isArchived, createdAt

logs/{habitId_YYYY-MM-DD}
  habitId, date, value, isCompleted, updatedAt

dayNotes/{YYYY-MM-DD}
  text, updatedAt
```
`YYYY-MM-DD` keys sort lexicographically the same as chronologically, which
is what lets the History calendar fetch a whole month with one range query
instead of one read per habit per day.

## Project structure
```
app/
  layout.tsx        — root layout, nav bar, PWA manifest link
  page.tsx           — "Today" dashboard
  history/page.tsx   — History tab (calendar + day detail)
  globals.css
components/
  ProgressRing.tsx    — ring that shows >100% for over-achievement
  HabitCard.tsx        — dashboard row (checkbox / stepper / timer)
  FocusTimer.tsx        — local stopwatch, commits minutes on stop
  AddHabitModal.tsx
  Calendar.tsx           — month grid with per-day completion dots
  DayDetail.tsx            — day's logs + autosaving note
  NavBar.tsx
lib/
  types.ts    — Habit / HabitLog / DayNote
  date.ts     — YYYY-MM-DD helpers, month-grid builder
  firebase.ts — Firebase app + Firestore + offline persistence
  firestore.ts — all reads/writes (subscribe*, add/setLogValue/saveDayNote)
firestore.rules
```
