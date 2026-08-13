import crypto from "node:crypto";

/** Unique Evolution instance name for a tenant's own WhatsApp connection. */
export function generateInstanceName(): string {
  return `wa_${crypto.randomBytes(12).toString("hex")}`;
}
