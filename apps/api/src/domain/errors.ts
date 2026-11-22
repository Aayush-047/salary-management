/**
 * A broken business rule, independent of HTTP. The error handler maps it to a response:
 * 404 when something doesn't exist, 409 when the current state forbids the change
 * (e.g. the employee has left), 422 when the change itself breaks a rule (e.g. a future date).
 */
export class DomainError extends Error {
  constructor(
    readonly status: 404 | 409 | 422,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const notFound = (code: string, message: string) => new DomainError(404, code, message);
export const conflict = (code: string, message: string) => new DomainError(409, code, message);
export const invalid = (code: string, message: string) => new DomainError(422, code, message);
