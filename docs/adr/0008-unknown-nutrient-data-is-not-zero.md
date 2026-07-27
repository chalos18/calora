# Unknown nutrient data is not zero, and restrictions filter before generation

Two rules govern everything Calora says about micronutrients.

**A nutrient with no data is unknown, never zero.** Every micronutrient total
carries a *coverage* figure — the share of the day's intake, by grams, whose food
data actually reports that nutrient. Below a threshold Calora reports "not enough
data to judge" instead of a shortfall.

This is forced by the sources. USDA carries up to 150 components per food, but
fewer than 20% of Open Food Facts entries have any micronutrient beyond sodium,
because only vitamin D, calcium, iron and potassium are mandatory on a US
nutrition label and the rest is rarely printed. A day of scanned products
therefore has genuine data for a fraction of what was eaten. Summing absent
values as zero would report confident deficiencies that are really just missing
label data — and the audience for this feature is older users chasing nutrient
adequacy, where a false deficiency drives real behaviour, including unnecessary
supplementation.

**A user's nutrient restrictions filter the candidate food set before the model
is invoked.** They are not an instruction in a prompt. A restricted food never
enters the set the model chooses from, so the restriction cannot be reasoned away
or lost in generation.

This exists because standard longevity advice inverts for conditions common in
exactly this demographic: vitamin K must be kept *consistent* on warfarin rather
than maximised, potassium and phosphorus are *restricted* in chronic kidney
disease, iron is *restricted* in hemochromatosis. "Have some spinach" is good
generic advice and a bad idea for a specific person.

## Consequences

The app will sometimes show a blank where a number is expected. That is the
honest reading and should not be "fixed" by defaulting to zero.

Coverage is computed from `LogEntryNutrient` presence against `LogEntry.grams`
rather than stored, so it cannot drift out of sync with the data it describes.

The agent suggests foods. It does not diagnose and does not advise doses. Several
known modelling gaps — cooking losses, bioavailability, untracked supplements —
mean intake is an approximation of what a body actually receives, which is a
further reason to keep that boundary firm.
