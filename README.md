# Calora

A nutrition tracker. Log what you eat into a daily diary and see it against
calorie and macronutrient goals derived from your body and your objective.

Mobile-first (iOS, Android) with a web companion, from one Expo codebase.

- [`CONTEXT.md`](./CONTEXT.md) — the glossary. Read this before naming anything.
- [`docs/adr/`](./docs/adr/) — nine decisions, several of which look like
  mistakes without the reasoning. Read `0001`, `0003` and `0009` before
  "fixing" what they describe.

## Running it

Nothing to install beyond dependencies — the dev server runs Postgres
in-process, so there is no database to set up.

```bash
pnpm install

# One-off: build the food registry (~90s, downloads ~10 MB from USDA).
cd data/seed && pnpm seed && cd ../..

# Terminal 1 — API on :3000. First run seeds 7,928 foods, ~9s.
pnpm dev:api

# Terminal 2 — the app.
cd apps/mobile
pnpm web        # browser
pnpm ios        # iOS simulator
pnpm android    # Android emulator
```

Open http://localhost:8081. You will land on onboarding: fill it in and it
works out your calorie and macro targets, then drops you on the diary.

Everything you log persists to `server/.dev-data`. Delete that directory to
start over.

### Trying it out

Search **black beans** — 25 results come back from real USDA data. Open one and
you get its actual portions (`cup` → 194 g), not a guess. Log it and watch the
donut and the day's totals move.

Two behaviours worth poking at deliberately, because they are the ones the
design turns on:

- Pick **cup** on a food that has no cup portion and no density category. Calora
  refuses rather than inventing a weight.
- Pick **tbsp** on broccoli. It converts via the density table and marks the
  result `≈`, because that number is inferred rather than measured.

## Verifying it

```bash
pnpm test        # 118 tests
pnpm typecheck   # four projects
pnpm smoke       # end-to-end against real USDA data
```

`pnpm smoke` runs the real server and asserts the things that would otherwise
fail silently: that a cup of black beans resolves to 194 g from a sourced
portion, that a tablespoon of broccoli falls back to the density table and is
flagged estimated, that a food with neither is refused, and that correcting a
food mid-flight does not rewrite a day already logged.

## Layout

```
apps/mobile/     Expo + Expo Router → iOS, Android, web
packages/core/   pure domain logic, no I/O: TDEE, macro targets, portions,
                 coverage, ranking
server/          Hono over Postgres; dev.ts swaps in in-process PGlite
data/seed/       USDA → reference.sqlite, the bundled offline registry
```

## Where this is up to

The core logging loop (M1) is built: onboarding, the diary with day navigation,
search, the food sheet, logging into meal slots, and history.

Not yet built, in order: barcode scanning, recipe import from a URL, pasted
recipe text, plate photos, micronutrient targets and the end-of-day summary,
gap recommendations and the nutritionist agent, pattern learning, and the
transparency surface.

Two things the plan asked for that are **not** done and should not be assumed:

- **Offline search.** `reference.sqlite` is built and bundled-ready, but the app
  does not load it yet — every search goes to the server.
- **Ranking precedence.** Search ranks on a weighted sum of history, provenance
  and text, so a stale single log can lose to a well-sourced match. The plan
  described strict precedence.
