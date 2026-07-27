# Log entries snapshot their nutrition

A Log Entry stores its own copy of the resolved nutrition figures at the moment
it is created, rather than referencing the Food and recomputing on read. Food
data genuinely changes — Open Food Facts contributors correct errors, and people
edit their own recipes — and without a snapshot those corrections silently
rewrite past days, which makes every total and trend in the app untrustworthy.
A diary is a historical record of what someone believed they ate and decided on;
it should not move under them.

## Consequences

Roughly ten numeric columns are denormalised onto every Log Entry. This looks
like an oversight to anyone reading the schema cold — it is deliberate, and
normalising it away would reintroduce the bug.

Corrections do not propagate to history, by design. If a Food's data was wrong
when it was logged, the past entry stays wrong; re-log it to pick up the fix.

`foodId` is still retained, for provenance display and for re-logging.

## Considered alternatives

**Recompute from current data.** Smaller rows and corrections propagate for free,
but past days mutate without the user touching them and weekly averages shift
retroactively with no explanation available in the UI.

**Versioned Foods**, with entries pointing at an immutable version. The
academically correct answer and fully auditable, but it adds a version table and
a join to every read path to give a single-user app an audit trail nobody will
read.
