# Macros are columns; other nutrients are rows

Calories and the four macros are stored as columns on `Food` and `LogEntry`,
while every other nutrient lives in `FoodNutrient` / `LogEntryNutrient` rows
against a `Nutrient` reference table. This is deliberately inconsistent, and the
inconsistency is the point.

Micronutrients pushed the nutrient count from eight to as many as 150 — USDA SR
Legacy carries up to 150 components per food — so columns stopped being viable
for the tail. But the home screen reads macros on every open and every day
navigation, and turning the most-used screen in the app into a join and aggregate
over hundreds of rows to display four numbers would be a real regression.

Rows also keep `FoodNutrient` indexable, which matters because "which foods are
high in the nutrient this person is short on" is the query the entire gap
recommendation feature rests on.

## Consequences

Adding a nutrient is a row in `Nutrient`, never a migration.

Two mechanisms exist for what is conceptually one thing, so a nutrient total must
know which tier it lives in. Worth it: the alternative was making the hot path
slow to make the cold path uniform.

Log entry nutrients are frozen at log time under the same rule as ADR-0001. The
snapshot now spans both tiers.

## Considered alternatives

**Fully normalised**, macros included. One uniform mechanism and no special
cases, but the home screen pays for that purity on every single open.

**A JSON nutrient map** on each row. Minimal schema and naturally sparse, but
daily totals require unnesting JSON in the aggregate with no index, and the
"high in calcium" query degrades to a scan.
