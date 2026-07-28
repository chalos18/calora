import { describe, expect, it } from "vitest";
import { validateEmail } from "./email";

describe("validateEmail", () => {
  it("accepts an ordinary address", () => {
    expect(validateEmail("ana@calora.local")).toBeUndefined();
  });

  it("accepts an address the user padded with spaces", () => {
    expect(validateEmail("  ana@calora.local  ")).toBeUndefined();
  });

  it("asks for an address when the field is empty", () => {
    expect(validateEmail("   ")).toBe("Enter your email address.");
  });

  it("rejects something that is not an address at all", () => {
    expect(validateEmail("ana")).toContain("does not look like");
  });

  it("rejects an address with no domain suffix", () => {
    expect(validateEmail("ana@calora")).toContain("does not look like");
  });
});
