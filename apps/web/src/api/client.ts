const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/** An error response from the API, matching its `{error: {code, message, details?}}` shape. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorBody = { error?: { code?: string; message?: string; details?: unknown } };

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ErrorBody;
    throw new ApiError(
      res.status,
      body.error?.code ?? "UNKNOWN",
      body.error?.message ?? `Request failed with status ${res.status}`,
      body.error?.details,
    );
  }
  return (await res.json()) as T;
}
