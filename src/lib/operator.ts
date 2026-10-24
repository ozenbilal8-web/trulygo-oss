/** Public display information for an independently operated installation. */
export function normalizeOperatorEmail(value: string | undefined): string {
  // Keep contact links to a conservative address form without mailto query data.
  if (value && /[\r\n]/.test(value)) return "";
  const email = value?.trim() ?? "";
  if (!email || email.length > 254) return "";
  return /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(email) ? email : "";
}

export const OPERATOR_NAME =
  process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim().replace(/[\r\n]+/g, " ").slice(0, 120) ||
  "Operator not configured";
export const SUPPORT_EMAIL = normalizeOperatorEmail(process.env.NEXT_PUBLIC_SUPPORT_EMAIL);
export const PRIVACY_EMAIL = normalizeOperatorEmail(process.env.NEXT_PUBLIC_PRIVACY_EMAIL);
