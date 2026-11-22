import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().url(),
});

export type Config = {
  port: number;
  corsOrigin: string;
  databaseUrl: string;
};

/** Parses environment variables; throws on invalid values so a bad deploy fails at startup. */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return {
    port: result.data.PORT,
    corsOrigin: result.data.CORS_ORIGIN,
    databaseUrl: result.data.DATABASE_URL,
  };
}
