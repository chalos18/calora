/**
 * Whether user-created foods must be reviewed before entering the registry.
 *
 * Off today: Calora runs single-user, so a queue would mean the same person
 * approving their own submissions. The columns and this flag exist from day
 * one so that turning it on later leaves only the moderation screen to build,
 * with no migration.
 */
export const requireApproval = (): boolean =>
  process.env.CALORA_REQUIRE_APPROVAL === "true";

/** The status a newly created food takes, given the flag. */
export const initialFoodStatus = (): "approved" | "pending" =>
  requireApproval() ? "pending" : "approved";
