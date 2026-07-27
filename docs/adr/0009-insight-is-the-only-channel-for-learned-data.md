# Insight is the only channel for anything learned about a user

No feature may learn anything about a user except by writing an `Insight` row
recording what was inferred, when, and which log entries it came from. Insights
are read at prompt-build time and are never fine-tuned into a model or cached
into a stored prompt, so deleting one genuinely erases it.

The `Insight` table ships empty in M1, months before anything writes to it. That
is intentional: what ships is the constraint, not the feature.

## Why it cannot wait

This is the one decision here that cannot be retrofitted. Once a feature is
allowed to learn something without writing it down, the knowledge disperses into
prompt history, embeddings and model context. A transparency layer built after
that point has nothing honest to enumerate — "show me everything you know about
me" becomes unanswerable, and "delete it" becomes unkeepable.

Building the surface later is easy. Establishing the rule later is impossible.

## Scope

The goal is that a user can inspect every inference, see the evidence behind it,
export it, and delete it individually or wholesale.

Adopted from Odysseus: **ownership** — the user's data is theirs, visible and
removable. Not adopted: **self-hosting**. Running models locally would reverse
ADR-0004 and the client/server split, and local vision models are weakest at the
hardest task in the app, estimating portion weight from a photograph. Because
insights are ordinary rows rather than model state, moving to local inference
later remains a service-level change.

## Consequences

An empty table and an unused entity sit in the schema from M1. Reviewers will
read this as over-engineering; it is a deliberate constraint on how every later
feature may be built.

Any feature that wants to personalise must route through Insight, including ones
where stashing state elsewhere would be more convenient. That friction is the
mechanism working, not a problem with it.
