-- Calora M1 schema.
--
-- Two decisions dominate the shape here and should not be "tidied away":
--
--   * Log entries carry their own copy of the nutrition figures. Past days must
--     not move when upstream data is corrected or a recipe is edited.
--   * Macros are columns while every other nutrient is a row. The home screen
--     reads macros constantly; micronutrients are only needed for the daily
--     summary and can afford an aggregate.

CREATE TYPE sex_at_birth   AS ENUM ('male', 'female');
CREATE TYPE activity_level AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');
CREATE TYPE goal_type      AS ENUM ('lose', 'maintain', 'gain', 'build_muscle');
CREATE TYPE meal_slot      AS ENUM ('breakfast', 'lunch', 'dinner', 'snacks');
CREATE TYPE provenance     AS ENUM ('usda', 'openfoodfacts', 'recipe', 'user');
CREATE TYPE food_status    AS ENUM ('approved', 'pending', 'rejected');
CREATE TYPE portion_source AS ENUM ('usda', 'off', 'density', 'user');
CREATE TYPE restriction_kind AS ENUM ('limit', 'avoid');
CREATE TYPE recipe_input_kind AS ENUM ('url', 'text');

-- ---------------------------------------------------------------- people

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  sex_at_birth  sex_at_birth NOT NULL,
  birth_date    date NOT NULL,
  height_cm     numeric(5,1) NOT NULL,
  activity_level activity_level NOT NULL,
  goal_type     goal_type NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE weight_entries (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date    date NOT NULL,
  kg      numeric(5,2) NOT NULL,
  UNIQUE (user_id, date)
);

-- Dated rather than overwritten, for the same reason log entries are frozen:
-- a past day should be shown against the target that applied on that day.
CREATE TABLE goals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  effective_from date NOT NULL,
  kcal           integer NOT NULL,
  protein_g      integer NOT NULL,
  fat_g          integer NOT NULL,
  carbs_g        integer NOT NULL,
  is_feasible    boolean NOT NULL DEFAULT true,
  UNIQUE (user_id, effective_from)
);

-- ------------------------------------------------------------ nutrients

CREATE TABLE nutrients (
  id       text PRIMARY KEY,          -- 'CA', 'FE', 'VITC'
  name     text NOT NULL,
  unit     text NOT NULL,             -- 'mg', 'ug', 'g'
  is_macro boolean NOT NULL DEFAULT false
);

-- Dietary Reference Intakes, transcribed from the NIH tables. No API exists.
CREATE TABLE nutrient_targets (
  nutrient_id text NOT NULL REFERENCES nutrients(id) ON DELETE CASCADE,
  sex         sex_at_birth NOT NULL,
  age_min     integer NOT NULL,
  age_max     integer NOT NULL,
  rda_amount  numeric(12,4) NOT NULL,
  upper_limit numeric(12,4),
  PRIMARY KEY (nutrient_id, sex, age_min)
);

-- Nutrients a person must limit or avoid. Applied as a filter over candidate
-- foods before any suggestion is generated, never as a prompt instruction.
CREATE TABLE user_restrictions (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nutrient_id text NOT NULL REFERENCES nutrients(id) ON DELETE CASCADE,
  kind        restriction_kind NOT NULL,
  note        text,
  PRIMARY KEY (user_id, nutrient_id)
);

-- ------------------------------------------------------------- registry

CREATE TABLE foods (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  brand_name    text,
  provenance    provenance NOT NULL,
  external_id   text,                 -- FDC id or barcode
  density_category text,

  -- Hot path: read on every home screen open and every day navigation.
  kcal    numeric(8,2) NOT NULL,
  protein numeric(8,2) NOT NULL,
  carbs   numeric(8,2) NOT NULL,
  fat     numeric(8,2) NOT NULL,

  -- Moderation, gated by a requireApproval flag that is currently off.
  status       food_status NOT NULL DEFAULT 'approved',
  submitted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provenance, external_id)
);

CREATE INDEX foods_name_trgm ON foods USING gin (name gin_trgm_ops);
CREATE INDEX foods_status ON foods (status) WHERE status = 'pending';

-- The long tail. Absence of a row means the food's data does not report that
-- nutrient - which is not the same as reporting zero.
CREATE TABLE food_nutrients (
  food_id       uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  nutrient_id   text NOT NULL REFERENCES nutrients(id) ON DELETE CASCADE,
  amount_per_100g numeric(12,4) NOT NULL,
  source        provenance NOT NULL,
  PRIMARY KEY (food_id, nutrient_id)
);

-- Drives "which foods are high in the nutrient this person is short on".
CREATE INDEX food_nutrients_by_nutrient
  ON food_nutrients (nutrient_id, amount_per_100g DESC);

CREATE TABLE portions (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  label   text NOT NULL,
  grams   numeric(8,2) NOT NULL,
  source  portion_source NOT NULL,
  UNIQUE (food_id, label)
);

CREATE TABLE recipes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id        uuid NOT NULL UNIQUE REFERENCES foods(id) ON DELETE CASCADE,
  source_url     text,
  input_kind     recipe_input_kind NOT NULL,
  yield_servings numeric(6,2) NOT NULL,
  yield_grams    numeric(8,2),
  instructions   text[] NOT NULL DEFAULT '{}',
  -- What the page claimed, kept only as a cross-check against our own figures.
  stated_nutrition jsonb
);

CREATE TABLE recipe_ingredients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id    uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  food_id      uuid REFERENCES foods(id) ON DELETE SET NULL,
  quantity     numeric(8,3),
  unit         text,
  grams        numeric(8,2),
  raw_text     text NOT NULL,
  is_estimated boolean NOT NULL DEFAULT false,
  position     integer NOT NULL
);

-- ---------------------------------------------------------------- diary

CREATE TABLE log_entries (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date      date NOT NULL,
  meal_slot meal_slot NOT NULL,

  -- Kept for provenance display and re-logging, NOT for recomputing totals.
  food_id   uuid REFERENCES foods(id) ON DELETE SET NULL,

  food_name     text NOT NULL,
  portion_label text NOT NULL,
  quantity      numeric(8,3) NOT NULL,
  grams         numeric(8,2) NOT NULL,
  is_estimated  boolean NOT NULL DEFAULT false,

  -- Frozen at log time. Denormalised on purpose: normalising these away
  -- reintroduces the bug where correcting a food rewrites history.
  kcal    numeric(8,2) NOT NULL,
  protein numeric(8,2) NOT NULL,
  carbs   numeric(8,2) NOT NULL,
  fat     numeric(8,2) NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX log_entries_by_day ON log_entries (user_id, date);

-- Frozen under the same rule as the macro columns above.
CREATE TABLE log_entry_nutrients (
  log_entry_id uuid NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
  nutrient_id  text NOT NULL REFERENCES nutrients(id) ON DELETE CASCADE,
  amount       numeric(12,4) NOT NULL,
  PRIMARY KEY (log_entry_id, nutrient_id)
);

-- ------------------------------------------------------------- learning

-- Ships empty. Its purpose from day one is the rule it enforces: no feature
-- may learn anything about a user except by writing a row here, with the log
-- entries it was drawn from. Insights are read at prompt-build time and never
-- baked into a model, so deleting one genuinely erases it.
CREATE TABLE insights (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind              text NOT NULL,
  statement         text NOT NULL,
  confidence        numeric(3,2) NOT NULL,
  derived_from      uuid[] NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_confirmed_at timestamptz,
  deleted_at        timestamptz
);

CREATE INDEX insights_live ON insights (user_id) WHERE deleted_at IS NULL;
