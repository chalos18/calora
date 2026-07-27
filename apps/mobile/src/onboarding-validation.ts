import { dateInputPlaceholder, parseDateInput } from "./date-input";

export interface OnboardingFields {
  email: string;
  birthDate: string;
  heightCm: string;
  weightKg: string;
}

export type OnboardingErrors = Partial<Record<keyof OnboardingFields, string>>;

/** Mifflin-St Jeor is an adult equation and was not validated below this. */
const MIN_AGE = 18;
const MAX_AGE = 120;

const HEIGHT_RANGE = { min: 100, max: 250 };
const WEIGHT_RANGE = { min: 25, max: 400 };

const yearsBetween = (isoBirthDate: string, on: Date): number => {
  const [year, month, day] = isoBirthDate.split("-").map(Number);
  let age = on.getFullYear() - year!;

  const monthDiff = on.getMonth() - (month! - 1);
  if (monthDiff < 0 || (monthDiff === 0 && on.getDate() < day!)) age -= 1;

  return age;
};

const numberIn = (
  raw: string,
  range: { min: number; max: number },
): number | null => {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return value >= range.min && value <= range.max ? value : null;
};

/**
 * Validate the onboarding form, keyed by field.
 *
 * Every message names the field it belongs to so the UI can show it against
 * that input rather than as one anonymous banner, and says what a correct
 * value looks like rather than only that the current one is wrong.
 *
 * All fields are checked on every call: being told about one problem, fixing
 * it, and then being told about the next is the worst version of this form.
 */
export const validateOnboarding = (
  fields: OnboardingFields,
  locale?: string,
  on: Date = new Date(),
): OnboardingErrors => {
  const errors: OnboardingErrors = {};

  if (fields.email.trim() === "") {
    errors.email = "Enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors.email = "That does not look like an email address.";
  }

  if (fields.birthDate.trim() === "") {
    errors.birthDate = "Enter your date of birth.";
  } else {
    const iso = parseDateInput(fields.birthDate, locale);
    const shape = dateInputPlaceholder(locale);
    const example = shape
      .replace("DD", "15")
      .replace("MM", "01")
      .replace("YYYY", "1996");

    if (iso === null) {
      errors.birthDate = `Use ${shape}, for example ${example}.`;
    } else {
      const age = yearsBetween(iso, on);
      if (age < 0) {
        errors.birthDate = "That date is in the future.";
      } else if (age > MAX_AGE) {
        errors.birthDate = `That would make your age over ${MAX_AGE}. Check the year.`;
      } else if (age < MIN_AGE) {
        errors.birthDate = `Calora's calorie calculation is only reliable from age ${MIN_AGE}.`;
      }
    }
  }

  if (fields.heightCm.trim() === "") {
    errors.heightCm = "Enter your height in centimetres.";
  } else if (numberIn(fields.heightCm, HEIGHT_RANGE) === null) {
    errors.heightCm = `Enter a height between ${HEIGHT_RANGE.min} and ${HEIGHT_RANGE.max} cm.`;
  }

  if (fields.weightKg.trim() === "") {
    errors.weightKg = "Enter your weight in kilograms.";
  } else if (numberIn(fields.weightKg, WEIGHT_RANGE) === null) {
    errors.weightKg = `Enter a weight between ${WEIGHT_RANGE.min} and ${WEIGHT_RANGE.max} kg.`;
  }

  return errors;
};
