import crypto from "node:crypto";
import process from "node:process";

function requireSecret(envVar: string): string {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`${envVar} must be set to use WhatsApp OTP.`);
  }
  return value;
}

/** HMAC-SHA256, hex-encoded. Leaked DB rows never reveal the raw OTP code. */
export function hashOtpCode(code: string): string {
  return crypto.createHmac("sha256", requireSecret("OTP_HASH_SECRET")).update(code).digest("hex");
}

export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare equal-length buffers anyway so this takes ~constant time
    // regardless of the mismatch, avoiding a length side-channel.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
