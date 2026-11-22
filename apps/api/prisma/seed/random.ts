/**
 * Small deterministic random helpers for the seed. The same seed always produces the
 * same sequence, so generated data is reproducible on every machine and in tests.
 */
export type Random = {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max], both inclusive. */
  int(min: number, max: number): number;
  /** Uniform float in [min, max). */
  float(min: number, max: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** Uniformly chosen item. */
  pick<T>(items: readonly T[]): T;
  /** Item chosen with probability proportional to its weight. */
  weighted<T>(entries: readonly (readonly [item: T, weight: number])[]): T;
};

/** mulberry32: a tiny, fast PRNG with good enough statistical quality for test data. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function createRandom(seed: number): Random {
  if (!Number.isInteger(seed)) {
    throw new Error(`Seed must be an integer, got ${seed}`);
  }
  const next = mulberry32(seed);

  return {
    next,

    int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
        throw new Error(`Invalid integer range [${min}, ${max}]`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },

    float(min, max) {
      if (min > max) {
        throw new Error(`Invalid range [${min}, ${max})`);
      }
      return min + next() * (max - min);
    },

    chance(p) {
      return next() < p;
    },

    pick(items) {
      if (items.length === 0) {
        throw new Error("Cannot pick from an empty list");
      }
      return items[Math.floor(next() * items.length)]!;
    },

    weighted(entries) {
      const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
      if (entries.some(([, weight]) => weight < 0) || !(total > 0)) {
        throw new Error("Weights must be non-negative with a positive total");
      }
      let threshold = next() * total;
      for (const [item, weight] of entries) {
        threshold -= weight;
        if (threshold < 0) return item;
      }
      // Floating-point rounding can leave a tiny remainder: fall back to the last weighted item.
      return entries.findLast(([, weight]) => weight > 0)![0];
    },
  };
}
