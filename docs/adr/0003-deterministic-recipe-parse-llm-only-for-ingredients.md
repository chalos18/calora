# Recipe import parses deterministically; the model only resolves ingredients

Recipe URL import extracts the recipe's name, ingredient lines, instructions and
yield by parsing the page's schema.org `Recipe` JSON-LD — no model involved. A
single language-model call is then used for the one genuinely semantic step:
turning ingredient lines like `"2 cups black beans, soaked overnight"` into
`{ quantity, unit, foodId }` against the registry. Macros are computed from the
matched Foods.

This looks backwards if you assume structured extraction needs a model. It does
not: recipe sites embed JSON-LD almost universally because Google requires it for
rich-result cards, so it is an SEO obligation rather than a courtesy, and
coverage is excellent. Parsing it is free, instant and identical on every run.
Sending the page to a model instead would pay a large-context call to re-derive
data already sitting in the HTML, and make the result vary between runs.

## Consequences

Nutrition figures stated on the recipe page are **displayed as a cross-check,
never used as the source**. Recipe macros always come from the same registry
Foods as everything else logged, so a recipe's numbers are comparable with the
rest of the diary rather than reflecting whatever the author calculated.

Pages with no structured data are not supported by the deterministic path. That
is an accepted gap; adding a model fallback later is a small, contained change.

## Do not "fix" this

The obvious-looking simplification — hand the whole page to the model — is the
alternative that was rejected. It costs more, produces different answers on
different days, and invites hallucinated macros in place of computed ones.
