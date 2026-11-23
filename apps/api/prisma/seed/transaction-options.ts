/**
 * Prisma's defaults (2 s to start a transaction, 5 s to finish) are too tight for seeding a
 * remote database: a serverless database may need seconds to wake up, and every statement
 * pays the network round trip.
 */
export const SEED_TRANSACTION_OPTIONS = { maxWait: 30_000, timeout: 120_000 } as const;
