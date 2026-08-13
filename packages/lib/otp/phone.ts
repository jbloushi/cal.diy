import { parsePhoneNumberWithError } from "libphonenumber-js/max";

import { HttpError } from "../http-error";

/**
 * Normalizes to E.164 (e.g. "+96550000000"). Throws rather than silently
 * accepting an unparseable number — every OTP/lookup call site needs the
 * exact same canonical string or a phone could hash to two different
 * identities depending on how it was typed.
 */
export function normalizePhoneNumber(rawPhoneNumber: string): string {
  let parsed;
  try {
    parsed = parsePhoneNumberWithError(rawPhoneNumber);
  } catch {
    throw new HttpError({ statusCode: 400, message: "Please enter a valid mobile number." });
  }
  if (!parsed?.isValid()) {
    throw new HttpError({ statusCode: 400, message: "Please enter a valid mobile number." });
  }
  return parsed.number;
}
