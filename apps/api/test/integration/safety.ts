/**
 * Integration tests truncate every table. Refuse to run unless the target database is
 * clearly a test database, so a misconfigured URL can never wipe dev or production data.
 */
export function assertIsTestDatabaseUrl(url: string | undefined): string {
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set");
  }
  let databaseName: string;
  try {
    databaseName = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    throw new Error("TEST_DATABASE_URL is not a valid URL");
  }
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to run integration tests against database "${databaseName}": its name must end in "_test"`,
    );
  }
  return url;
}
