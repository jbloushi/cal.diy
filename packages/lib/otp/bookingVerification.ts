import prisma from "@calcom/prisma";

import { checkRateLimitAndThrowError } from "../checkRateLimitAndThrowError";
import { HttpError } from "../http-error";
import { EvolutionClient } from "../whatsapp/evolutionClient";
import { WhatsAppError } from "../whatsapp/errors";
import { findWhatsAppConnectionForEventType } from "../whatsapp/resolveWhatsAppConnectionForEventType";
import { constantTimeEqual, generateOtpCode, hashOtpCode, signBookingVerificationPayload } from "./hash";
import { normalizePhoneNumber } from "./phone";

const OTP_EXPIRY_SECONDS = Number(process.env.OTP_EXPIRY_SECONDS ?? 300);
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);
const OTP_TOKEN_EXPIRY_SECONDS = Number(process.env.OTP_TOKEN_EXPIRY_SECONDS ?? 600);

// A TZ-less string (no "Z", no numeric offset) parses as *local* time in
// whatever timezone the Node process happens to run in — the same
// wall-clock string could canonicalize to a different UTC instant on a dev
// laptop vs. a deployed server. Reject that input class outright.
const HAS_EXPLICIT_TZ = /(Z|[+-]\d{2}:?\d{2})$/;

function canonicalizeBookingStart(bookingStartIso: string): string {
  if (!HAS_EXPLICIT_TZ.test(bookingStartIso)) {
    throw new HttpError({ statusCode: 400, message: "Invalid booking time." });
  }
  const parsed = new Date(bookingStartIso);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError({ statusCode: 400, message: "Invalid booking time." });
  }
  return parsed.toISOString();
}

/**
 * Binds a verification to an exact booking context (connection + phone +
 * event type + instant), so a token issued for one booking can never be
 * replayed against a different one. The booker's raw timeslot and the
 * eventual booking submission spell the same instant differently (one has
 * "Z", the other a local offset from dayjs().format()) — canonicalizing to
 * a UTC instant is what makes request-time and submit-time hashes match.
 */
function bookingContextCanonical(input: {
  whatsAppConnectionId: string;
  phoneNumberE164: string;
  eventTypeId: number;
  bookingStartIso: string;
  issuedAtMs: number;
}): string {
  return [
    input.whatsAppConnectionId,
    input.phoneNumberE164,
    input.eventTypeId,
    canonicalizeBookingStart(input.bookingStartIso),
    input.issuedAtMs,
  ].join("|");
}

/**
 * Builds a signed, time-bound verification token: `<issuedAtMs>.<hmac>`. The
 * HMAC (keyed by OTP_HASH_SECRET) is what makes the token unforgeable — the
 * payload it signs is otherwise entirely attacker-knowable — and the
 * embedded issuedAt is what lets enforcement reject stale tokens.
 */
function hashBookingContext(input: {
  whatsAppConnectionId: string;
  phoneNumberE164: string;
  eventTypeId: number;
  bookingStartIso: string;
  issuedAtMs: number;
}): string {
  const canonical = bookingContextCanonical(input);
  const signature = signBookingVerificationPayload(canonical);
  return `${input.issuedAtMs}.${signature}`;
}

export async function requestBookingOtp(input: {
  whatsAppConnectionId: string;
  rawPhoneNumber: string;
  ipAddress?: string;
}) {
  const connection = await prisma.whatsAppConnection.findUnique({ where: { id: input.whatsAppConnectionId } });
  if (!connection) throw new WhatsAppError("WHATSAPP_INSTANCE_NOT_FOUND");
  if (connection.status !== "CONNECTED") throw new WhatsAppError("WHATSAPP_NOT_CONNECTED");

  const phoneNumber = normalizePhoneNumber(input.rawPhoneNumber);
  await checkRateLimitAndThrowError({ rateLimitingType: "sms", identifier: `booking-otp:phone:${phoneNumber}` });
  if (input.ipAddress) {
    await checkRateLimitAndThrowError({ rateLimitingType: "sms", identifier: `booking-otp:ip:${input.ipAddress}` });
  }

  const recent = await prisma.otpVerification.findFirst({
    where: {
      phoneNumber,
      purpose: "BOOKING_VERIFICATION",
      whatsAppConnectionId: connection.id,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent && (Date.now() - recent.createdAt.getTime()) / 1000 < OTP_RESEND_COOLDOWN_SECONDS) {
    throw new HttpError({ statusCode: 429, message: "Please wait before requesting another code." });
  }

  const code = generateOtpCode();
  const client = new EvolutionClient();
  // Send before persisting — a failed send should never leave behind a code
  // the client could otherwise try against.
  await client.sendTextMessage(
    connection.instanceName,
    phoneNumber,
    `Your verification code is ${code}. It expires in 5 minutes.`
  );

  await prisma.otpVerification.create({
    data: {
      phoneNumber,
      purpose: "BOOKING_VERIFICATION",
      whatsAppConnectionId: connection.id,
      codeHash: hashOtpCode(code),
      expiresAt: new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000),
    },
  });

  return { success: true as const, expiresIn: OTP_EXPIRY_SECONDS, resendAfter: OTP_RESEND_COOLDOWN_SECONDS };
}

export async function verifyBookingOtp(input: {
  whatsAppConnectionId: string;
  rawPhoneNumber: string;
  code: string;
  eventTypeId: number;
  bookingStartIso: string;
}) {
  const phoneNumber = normalizePhoneNumber(input.rawPhoneNumber);
  const record = await prisma.otpVerification.findFirst({
    where: {
      phoneNumber,
      purpose: "BOOKING_VERIFICATION",
      whatsAppConnectionId: input.whatsAppConnectionId,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!record) {
    throw new HttpError({ statusCode: 400, message: "That verification code has expired. Please request a new one." });
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    throw new HttpError({ statusCode: 429, message: "Too many incorrect attempts. Please request a new code." });
  }
  if (!constantTimeEqual(hashOtpCode(input.code), record.codeHash)) {
    await prisma.otpVerification.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw new HttpError({ statusCode: 400, message: "That verification code is incorrect." });
  }

  await prisma.otpVerification.update({ where: { id: record.id }, data: { consumedAt: new Date() } });

  // The verification token is an HMAC-signed, timestamped context hash —
  // enforcement below recomputes the same signature from the booking
  // payload and the embedded issuedAt, and rejects it once it's older than
  // OTP_TOKEN_EXPIRY_SECONDS, so it's self-verifying, time-bound, and can't
  // be replayed against a different phone/event/slot.
  const verificationToken = hashBookingContext({
    whatsAppConnectionId: input.whatsAppConnectionId,
    phoneNumberE164: phoneNumber,
    eventTypeId: input.eventTypeId,
    bookingStartIso: input.bookingStartIso,
    issuedAtMs: Date.now(),
  });

  return { verificationToken, expiresIn: OTP_TOKEN_EXPIRY_SECONDS };
}

/**
 * Called at the actual booking-creation boundary. Bypassed for a logged-in
 * user who is themselves an accepted member (team-owned event) or the
 * owner (individual event) of the connection — they're already a known,
 * authenticated identity, not an anonymous public booker.
 */
export async function enforcePhoneVerificationForPublicBooking(input: {
  eventTypeId: number;
  phoneNumber: string | undefined;
  bookingStartIso: string;
  verificationToken: string | undefined;
  loggedInUserId?: number;
}) {
  const connection = await findWhatsAppConnectionForEventType(input.eventTypeId);
  if (!connection) return; // Owner has no WhatsApp connected — no-op, standard cal.com booking.

  if (input.loggedInUserId) {
    if (connection.userId === input.loggedInUserId) return;
    if (connection.teamId) {
      const membership = await prisma.membership.findFirst({
        where: { userId: input.loggedInUserId, teamId: connection.teamId, accepted: true },
        select: { id: true },
      });
      if (membership) return;
    }
  }

  if (!input.phoneNumber || !input.verificationToken) {
    throw new HttpError({ statusCode: 400, message: "Phone verification is required to book this event." });
  }

  const phoneNumber = normalizePhoneNumber(input.phoneNumber);

  const [issuedAtRaw, signature] = input.verificationToken.split(".");
  const issuedAtMs = Number(issuedAtRaw);
  if (!issuedAtRaw || !signature || !Number.isFinite(issuedAtMs)) {
    throw new HttpError({ statusCode: 400, message: "Invalid verification token. Please verify your number again." });
  }
  if ((Date.now() - issuedAtMs) / 1000 > OTP_TOKEN_EXPIRY_SECONDS) {
    throw new HttpError({
      statusCode: 409,
      message: "Your verification has expired. Please verify your number again.",
    });
  }

  const expectedToken = hashBookingContext({
    whatsAppConnectionId: connection.id,
    phoneNumberE164: phoneNumber,
    eventTypeId: input.eventTypeId,
    bookingStartIso: input.bookingStartIso,
    issuedAtMs,
  });

  if (!constantTimeEqual(input.verificationToken, expectedToken)) {
    throw new HttpError({
      statusCode: 409,
      message: "Your selected appointment changed since verification. Please verify your number again.",
    });
  }
}
