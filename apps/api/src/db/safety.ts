/**
 * Tests and e2e setup truncate every table. Refuse to run unless the target database is
 * clearly a disposable one, so a misconfigured URL can never wipe dev or production data.
 */
export function assertDisposableDatabaseUrl(
  url: string | undefined,
  suffix: "_test" | "_e2e",
  variable: string,
): string {
  if (!url) {
    throw new Error(`${variable} is not set`);
  }
  let databaseName: string;
  try {
    databaseName = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    throw new Error(`${variable} is not a valid URL`);
  }
  if (!databaseName.endsWith(suffix)) {
    throw new Error(
      `Refusing to use database "${databaseName}" from ${variable}: its name must end in "${suffix}"`,
    );
  }
  return url;
}

export function assertIsTestDatabaseUrl(url: string | undefined): string {
  return assertDisposableDatabaseUrl(url, "_test", "TEST_DATABASE_URL");
}

export function assertIsE2eDatabaseUrl(url: string | undefined): string {
  return assertDisposableDatabaseUrl(url, "_e2e", "E2E_DATABASE_URL");
}
