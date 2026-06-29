export class ValidationError extends Error {}

export function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} is required.`);
  }
  if (value.length > maxLength) {
    throw new ValidationError(`${field} must be ${maxLength} characters or fewer.`);
  }
  return value;
}

const SCRIPT_TAG_RE = /<script\b[^>]*>|<\/script\s*>/i;

export function rejectScriptTags(value: string, field: string): void {
  if (SCRIPT_TAG_RE.test(value)) {
    throw new ValidationError(`${field} contains disallowed content.`);
  }
}
