# Calora — where the build is up to

Written 27 July 2026. Companion to the plan at
`~/.claude/plans/you-are-a-software-quiet-whistle.md`, which holds the full
reasoning behind decisions D1–D19 and milestones M1–M9.

---

## Two codebases exist

This is the most important thing on the page.

| | `~/workspace/calora` (this repo) | `~/workspace/calora-api` |
|---|---|---|
| Stack | Hono + PGlite/Postgres, Expo monorepo | NestJS + Prisma |
| Scope | Server **and** mobile/web app | API only |
| Built by | This session, from the plan | Earlier, separately |
| Tests | 146 | its own |
| Git | 5 commits | 3 commits |

**They are unrelated.** Nothing in this repo talks to `calora-api`, and
`pnpm dev:api` exists only here — which is why it wasn't found in `calora-api`.
Its equivalent there is `start:dev`.

Nothing has been done to reconcile them, because which one survives is not a
call to make silently. See "Open question" at the bottom.

---

## Milestone status

### M1 — core logging loop · **done**

| Piece | State |
|---|---|
| Monorepo, TypeScript, vitest | done |
| `CONTEXT.md` glossary, 9 ADRs | done |
| Postgres schema, incl. nutrient tables + empty `Insight` | done |
| USDA seed → `reference.sqlite` (7,928 foods, 10 MB) | done |
| Onboarding → TDEE → protein-first targets | done |
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
the area. `docs/adr/0003` and `0009` describe decisions that look like mistakes
without their reasoning and should not be "fixed" casually.

Before starting: `pnpm test`, `pnpm typecheck`, `pnpm smoke` should all pass.
That is the baseline any change has to keep.

---

## Open question

**Which codebase continues — this one or `calora-api`?**

They implement overlapping scope in different stacks. Options as I see them:

1. **Keep `calora`, retire `calora-api`.** It has the app, the domain docs, the
   seed pipeline and 146 tests, and the plan was written against it.
2. **Keep `calora-api` for the server, keep `calora`'s app.** Means porting the
   schema, ranking, portion resolution and snapshot rules into NestJS/Prisma,
   and re-proving the invariants there.
3. **Keep both deliberately**, for different purposes.

Nothing should be merged or deleted until you decide.
