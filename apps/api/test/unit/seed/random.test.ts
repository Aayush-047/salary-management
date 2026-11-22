import { describe, expect, it } from "vitest";
import { createRandom } from "../../../prisma/seed/random.js";

const sample = (seed: number, count = 5) => {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => random.next());
};

describe("createRandom", () => {
  it("produces the same sequence for the same seed", () => {
    expect(sample(42)).toEqual(sample(42));
  });

  it("produces different sequences for different seeds", () => {
    expect(sample(42)).not.toEqual(sample(43));
  });

  it("rejects a non-integer seed", () => {
    expect(() => createRandom(1.5)).toThrow(/integer/);
  });

  it("next() stays within [0, 1)", () => {
    const values = sample(7, 10_000);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });
});

describe("int", () => {
  it("returns integers within the inclusive range and reaches both ends", () => {
    const random = createRandom(1);
    const values = new Set(Array.from({ length: 1_000 }, () => random.int(1, 6)));

    expect([...values].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("returns the only value of a single-value range", () => {
    expect(createRandom(1).int(3, 3)).toBe(3);
  });

  it.each([
    [5, 1],
    [1.5, 3],
  ])("rejects the invalid range [%s, %s]", (min, max) => {
    expect(() => createRandom(1).int(min, max)).toThrow(/Invalid integer range/);
  });
});

describe("float", () => {
  it("stays within [min, max)", () => {
    const random = createRandom(2);
    const values = Array.from({ length: 1_000 }, () => random.float(0.9, 1.1));

    expect(Math.min(...values)).toBeGreaterThanOrEqual(0.9);
    expect(Math.max(...values)).toBeLessThan(1.1);
  });
});

describe("chance", () => {
  it("is true roughly p of the time", () => {
    const random = createRandom(3);
    const hits = Array.from({ length: 100_000 }, () => random.chance(0.06)).filter(Boolean).length;

    expect(hits / 100_000).toBeCloseTo(0.06, 2);
  });
});

describe("pick", () => {
  it("can return every item", () => {
    const random = createRandom(4);
    const picked = new Set(Array.from({ length: 200 }, () => random.pick(["a", "b", "c"])));

    expect(picked).toEqual(new Set(["a", "b", "c"]));
  });

  it("rejects an empty list", () => {
    expect(() => createRandom(4).pick([])).toThrow(/empty/);
  });
});

describe("weighted", () => {
  it("chooses items in proportion to their weights", () => {
    const random = createRandom(5);
    const counts = { US: 0, IN: 0, JP: 0 };
    for (let i = 0; i < 100_000; i++) {
      counts[
        random.weighted([
          ["US", 30],
          ["IN", 22],
          ["JP", 7],
        ] as const)
      ]++;
    }

    expect(counts.US / 100_000).toBeCloseTo(30 / 59, 2);
    expect(counts.IN / 100_000).toBeCloseTo(22 / 59, 2);
    expect(counts.JP / 100_000).toBeCloseTo(7 / 59, 2);
  });

  it("never chooses an item with zero weight", () => {
    const random = createRandom(6);
    const picks = Array.from({ length: 1_000 }, () =>
      random.weighted([
        ["never", 0],
        ["always", 1],
      ] as const),
    );

    expect(picks).not.toContain("never");
  });

  it.each([
    { name: "an empty list", entries: [] },
    { name: "all-zero weights", entries: [["a", 0]] as const },
    {
      name: "a negative weight",
      entries: [
        ["a", 2],
        ["b", -1],
      ] as const,
    },
  ])("rejects $name", ({ entries }) => {
    expect(() => createRandom(7).weighted(entries)).toThrow(/Weights/);
  });
});
