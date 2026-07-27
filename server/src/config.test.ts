import { afterEach, describe, expect, it } from "vitest";
import { initialFoodStatus, requireApproval } from "./config.js";

afterEach(() => {
  delete process.env.CALORA_REQUIRE_APPROVAL;
});

describe("requireApproval", () => {
  it("is off by default, so a single user does not review their own work", () => {
    expect(requireApproval()).toBe(false);
    expect(initialFoodStatus()).toBe("approved");
  });

  it("routes new foods to the queue once switched on", () => {
    // The whole point of shipping the columns early: this becomes true without
    // a migration when real users arrive.
    process.env.CALORA_REQUIRE_APPROVAL = "true";

    expect(requireApproval()).toBe(true);
    expect(initialFoodStatus()).toBe("pending");
  });

  it("treats any other value as off rather than guessing", () => {
    process.env.CALORA_REQUIRE_APPROVAL = "yes";
    expect(requireApproval()).toBe(false);
  });
});
