# Use an Anthropic API key, not the local Claude Code credentials

Calora's model calls authenticate with an `ANTHROPIC_API_KEY` held on the server.
The machine this project was designed on has Claude Code credentials at
`~/.claude/.credentials.json`, and reusing them was explicitly requested — but
they are a subscription OAuth token issued to authenticate Claude Code, not a
general-purpose API credential. Using them to back an application falls outside
Anthropic's usage terms, and the token rotates with no stable contract, so
recipe import would fail with auth errors at unpredictable times.

The cost objection this was meant to avoid does not materialise: at roughly ten
recipe imports and thirty photos a month the workload costs about **37¢/month**.

## Consequences

The key lives on the server and is never shipped to a client. On the web target
anything in the bundle is trivially extractable, so proxying model calls through
the API is a requirement rather than a preference — it is a large part of why a
server exists at all.

Milestones 1 and 2 run without any key. It is first needed for recipe import.

## Model selection

Chosen on task fit, since the cost spread between options is under 25¢/month:

- **Haiku 4.5** — recipe ingredient resolution. Structured text work it handles
  well, and noticeably faster, which matters because the user waits on it.
- **Sonnet 5** — plate photo analysis. Estimating how many grams of food sit on a
  plate from a 2D image is the hardest judgement in the app, and the error lands
  directly in a daily calorie total.
