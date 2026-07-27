# Multi-tenant shape at single-user scale

Calora has one user, but the data model is multi-tenant: every user-owned row
carries a `userId`, and the food registry is a separate global namespace rather
than "this person's foods". There is no signup flow, no moderation interface and
no hosting for anyone else.

This is deliberate rather than speculative. The registry is meant to grow to
cover dishes from many countries, which only works if contributions are global
from the start; and retrofitting tenancy means reshaping every table and
re-deciding who owns each food entry. Carrying a `userId` column costs nothing
now and makes the eventual change additive.

## Consequences

`Food` carries `status` (`approved | pending | rejected`) plus `submittedBy`,
`reviewedBy` and `reviewedAt` from day one, gated by a `requireApproval` flag
that is currently off — user-created foods auto-approve. When real users arrive,
that flag flips and only the moderation screen remains to be built. No migration.

Code will look over-built for its current scale. It is sized for the intended
scale, not the present one.
