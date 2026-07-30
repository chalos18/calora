# Calora — where the build is up to

Last updated 28 July 2026. Companion to the plan at
`~/.claude/plans/you-are-a-software-quiet-whistle.md`, which holds the full
reasoning behind decisions D1–D19 and milestones M1–M9.

Stack: Hono over PGlite/Postgres for the server, Expo for iOS, Android and web,
in one monorepo. 159 tests.

---

## Milestone status

### M1 — core logging loop · **done**

| Piece | State |
|---|---|
| Monorepo, TypeScript, vitest | done |
| `CONTEXT.md` glossary, 10 ADRs | done |
| Postgres schema, incl. nutrient tables + empty `Insight` | done |
| USDA seed → `reference.sqlite` (7,928 foods, 10 MB) | done |
| Onboarding → TDEE → protein-first targets | done |
| Sign in to an existing account; sign out | done, beyond plan |
| Home screen: donut, day navigation, macro bars | done |
| Search with history/provenance/text ranking | done |
| Food detail sheet: portions, macro table, provenance, ingredients | done |
| Logging into meal slots | done |
| History tab | done |
| Zero-setup dev server (PGlite) | done, beyond plan |
| Playwright browser driving | done, beyond plan |

### M1 gaps — asked for in the plan, **not built**

1. **Offline search.** `reference.sqlite` is built and bundle-ready, but the app
   never loads it — every search goes to the server. Needs `expo-sqlite`, the
   asset wired in, and a local FTS5 query path. The plan called this "testable
   from M1".
2. **No write queue.** Logging while offline fails rather than queueing.
3. **Ranking is a weighted sum**, not the strict precedence D12 describes. A
   stale single log can lose to a well-sourced match. Arguably better; it is
   simply not what was written down.
4. **Sign-in has no credential.** `POST /login` takes an email and returns that
   account. Deliberate and documented in `docs/adr/0010`, but it is the thing
   that must be fixed before Calora is hosted for anyone but its author.

### M2–M9 — not started

| Milestone | Contents |
|---|---|
| **M2** | Barcode scanning (`expo-camera`, `ean13`/`upc_a`) → Open Food Facts; manual food creation |
| **M3** | Recipe import: URL via JSON-LD, and pasted text (D19). Needs `ANTHROPIC_API_KEY` |
| **M4** | Plate photo → editable draft → confirm (D8) |
| **M5** | Web polish, offline hardening |
| **M6** | Micronutrient targets (DRI), coverage display, end-of-day notification |
| **M7** | Gap recommendations + nutritionist agent, restriction filtering (D16, D17) |
| **M8** | Pattern learning — the first writer to `Insight` |
| **M9** | Transparency surface: view, export, delete every learned insight |

The schema for M6–M9 already exists. `nutrients`, `food_nutrients`,
`log_entry_nutrients`, `nutrient_targets`, `user_restrictions` and `insights`
are all in `server/db/schema.sql` and seeded where applicable — those milestones
add behaviour, not tables.

---

## Fixed since the first build

Found by code review, then by driving the app in a real browser:

- Density categories were never populated, so the whole density fallback was
  unreachable. Then the first fix misclassified 542 foods as `salt` by matching
  the qualifier in "without salt" — a cup of cooked beans would have converted
  at 292 g instead of 172 g.
- Food detail read macros from navigation params, so opening it from History
  showed "Food" and a zero donut.
- `GET /foods/:id` was registered before `/foods/search` and swallowed it.
- `logFood` had no transaction; a partial failure left an entry with some of its
  frozen nutrients, which coverage would under-report forever.
- **CORS**: `app.use(cors())` ran after `createApp` had registered routes, so it
  did nothing — the browser's preflight 404'd and every POST from :8081 failed.
- **Duplicate email** surfaced as a bare 500.
- Session was in-memory, so a page reload dropped you back into onboarding.
- Invalid `transform-origin` DOM property from the donut's SVG.
- **Onboarding was the landing screen**, so anyone whose stored session had gone
  — a new browser, cleared storage, a reinstall — had no route back to their own
  account and could only create a second one under a different email. Sign-in is
  now the landing screen and onboarding branches off it.

---

## How to pick the work back up

Each milestone is self-contained. To continue:

```
/implement M2 from ~/.claude/plans/you-are-a-software-quiet-whistle.md
```

or, for the gaps above:

```
/implement offline search: load reference.sqlite via expo-sqlite and query
FTS5 locally, per D10 in the plan
```

Read first, in this order: `CONTEXT.md` for vocabulary, then the ADR covering
the area. `docs/adr/0003`, `0009` and `0010` describe decisions that look like
mistakes without their reasoning and should not be "fixed" casually.

Before starting: `pnpm test`, `pnpm typecheck`, `pnpm smoke` should all pass.
That is the baseline any change has to keep.

To open the app without filling anything in, tap **Use the test account** on the
sign-in screen — the dev server keeps `demo@calora.local` pre-onboarded and
idempotent, so whatever you logged into it last time is still there.

`pnpm lint` does **not** pass. `eslint.config.js` is newly added and the repo
has 14 pre-existing violations under it, in six files — mostly
`no-misused-promises` on `onPress` handlers, and `any` flowing through
`scripts/smoke.mts`. None are in the sign-in code. Worth a pass of its own.
