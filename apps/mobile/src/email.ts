/**
 * Email is the one field onboarding and logging in share, and the only thing
 * Calora currently uses to tell accounts apart. Both forms check it the same
 * way so that an address accepted on the way in is accepted on the way back.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The problem with this address, or undefined if there is none. */
export const validateEmail = (email: string): string | undefined => {
  const trimmed = email.trim();
  if (trimmed === "") return "Enter your email address.";
  if (!EMAIL_SHAPE.test(trimmed)) {
    return "That does not look like an email address.";
  }
  return undefined;
};
