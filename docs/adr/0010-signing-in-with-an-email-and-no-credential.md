# Signing in with an email and no credential

`POST /login` takes an email address and returns the account that uses it.
There is no password, no magic link and no token. Anyone who knows the address
is that person as far as the server is concerned.

This is a stated gap rather than an oversight. Calora currently runs for one
person on one machine, and the problem being solved is not "keep other people
out" — it is that a returning user with no stored session had no route back to
their own account. Onboarding was the landing screen, so the only path forward
was to create a second account under a different email and re-enter the same
height, weight and goal. That is a worse failure than the absence of a
credential, and it is the one that happens every time.

Authentication is deferred, not designed away. The account already exists as a
row with a stable id, and every request already carries a `userId` (ADR 0005),
so adding a credential is a change to how `userId` is obtained rather than a
change to what depends on it.

## Consequences

`server/src/accounts.ts` is the only place an email is turned into a `userId`.
When credentials arrive they go there, and callers do not move.

The demo account's address appears twice — `DEMO_ACCOUNT.email` on the server
and `DEMO_EMAIL` in `apps/mobile/src/demo-account.ts` — because the app and the
server are separate bundles with no shared package between them. Nothing
enforces that they agree; if you change one, change the other.

Emails are stored lowercased and trimmed, and matched the same way. A returning
user typing `Ana@Calora.local` on a phone keyboard must reach the account they
created as `ana@calora.local`, or they are back to the problem this solves.
Normalising on read alone would not be enough: the `UNIQUE` constraint on
`users.email` is case-sensitive, so the two spellings could exist as separate
accounts and sign-in would return whichever Postgres offered first. The
normalisation therefore happens on write, in `onboardUser`.

**This must not ship to more than one user as it stands.** Before Calora is
hosted for anyone else, `/login` needs a real credential. Nothing else in the
codebase enforces that, so it is written here.

## The demo account

The dev server creates `demo@calora.local` on boot, pre-onboarded, with a fixed
uuid. It exists so the app can be opened and looked at without filling in the
form, and it is idempotent so that whatever was logged into it yesterday is
still there today. It is created only by `server/src/dev.ts`; `index.ts`, which
production uses, never calls `ensureDemoAccount`.
