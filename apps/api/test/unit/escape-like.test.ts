import { describe, expect, it } from "vitest";
import { escapeLike } from "../../src/repositories/employee-repository.js";

describe("escapeLike", () => {
  it.each([
    { input: "schmidt", expected: "schmidt" },
    { input: "100%", expected: "100\\%" },
    { input: "a_b", expected: "a\\_b" },
    { input: "back\\slash", expected: "back\\\\slash" },
  ])("escapes $input", ({ input, expected }) => {
    expect(escapeLike(input)).toBe(expected);
  });
});
