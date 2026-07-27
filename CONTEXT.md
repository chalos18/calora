# Calora

A nutrition tracker. People log what they eat into a daily diary and see it
measured against calorie and macronutrient goals derived from their body and
their objective.

## Language

### Registry

The shared, growing catalogue of everything that can be eaten.

**Food**:
An atomic nutrition record, expressed per 100 g. Generic ("black beans, cooked")
or branded ("Heinz Baked Beans"). The only thing that can be searched or logged.
_Avoid_: item, product, ingredient

**Recipe**:
A composition of Foods with a yield and instructions. A Recipe yields exactly one
Food, which is what gets logged.
_Avoid_: dish, meal

**Portion**:
A named quantity of a particular Food with its weight in grams — "1 cup" → 172 g.
Portions belong to a Food, because the same name weighs different amounts
depending on what is being measured.
_Avoid_: serving, unit, measure

**Provenance**:
Where a Food's nutrition data came from, and therefore how much it should be
trusted. Sourced data outranks data a person typed in.
_Avoid_: source, origin

**Estimated**:
A quality of any figure Calora inferred rather than read from a source — a
portion weight derived from density, or a grams figure judged from a photograph.
Estimated values are always marked as such wherever they are shown.

**Nutrient**:
Anything measured in a Food — calories and macronutrients, but equally vitamins
and minerals. The unit of both what a Food contains and what a person is aiming
for.
_Avoid_: nutrient value, component

**Coverage**:
The share of a day's intake whose food data actually reports a given Nutrient.
Low coverage means Calora does not know, which is never the same as zero.

### Diary

What a person actually ate.

**Log Entry**:
One Food, at one quantity, in one Meal Slot, on one date. Carries its own copy of
the nutrition figures, so a past day never changes.
_Avoid_: entry, record, logged food

**Meal Slot**:
One of breakfast, lunch, dinner or snacks. A Log Entry belongs to exactly one.
_Avoid_: meal, category

**Diary**:
Everything logged on a single date, grouped by Meal Slot.
_Avoid_: journal, log

### Goals

**Goal**:
The calorie and macronutrient targets a person is eating towards. Derived from
their body and objective, and dated — a past day is judged against the Goal that
applied on that day, not today's.
_Avoid_: target, plan

**Activity Level**:
How much a person moves outside deliberate exercise, used to scale their
resting energy needs into a daily calorie requirement.

**Restriction**:
A Nutrient a person must limit or avoid. Restrictions remove foods from
consideration before anything is suggested, rather than discouraging them after.
_Avoid_: allergy, condition, preference

**Best Match**:
The result Calora ranks first for a search. Earned by a ranking rule — chiefly
what this person has eaten before — rather than assigned by a curator.

### Learning

**Insight**:
Something Calora has inferred about a person from what they logged, recorded so
it can be shown to them, exported, and deleted. Nothing is learned about a person
except as an Insight.
_Avoid_: memory, profile, preference, learning

**Evidence**:
The Log Entries an Insight was drawn from. Every Insight can be traced back to
what actually happened.

---

Note: **"meal"** is deliberately not a term here. It was used interchangeably to
mean a Meal Slot, a Recipe, and a registry entry, which are three different
things. Use the specific one.
