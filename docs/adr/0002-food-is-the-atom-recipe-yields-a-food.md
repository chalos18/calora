# Food is the atom; a Recipe yields a Food

`Food` is the only entity that can be searched or logged. `Recipe` is optional
detail attached to exactly one Food, carrying its source URL, yield, ingredients
and instructions; importing a recipe creates both. This keeps search uniform,
puts all macro arithmetic in one place, and gives every screen a single kind of
thing to render.

A Food displays an ingredient list precisely when it has a Recipe — which is how
someone checks that the feijoada they searched for resembles the feijoada they
actually cooked.

## Considered alternatives

**One unified entity** with an optional component list. Fewest tables, but
recipe-only columns sit null across every imported food, and "is this row an atom
or a composite?" becomes a rule enforced nowhere.

**Fully separate Food and Recipe types.** Conceptually cleanest, but a Log Entry
then needs `foodId XOR recipeId`, and search, daily totals and every detail view
grow two branches. The branching would appear in nearly every feature.
