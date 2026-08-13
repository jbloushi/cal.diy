import process from "node:process";

import prisma from "@calcom/prisma";

import { checkRateLimitAndThrowError } from "../checkRateLimitAndThrowError";
import { HttpError } from "../http-error";
import { sendPlatformWhatsAppMessage } from "../whatsapp/PlatformWhatsAppProvider";
import { constantTimeEqual, generateOtpCode, hashOtpCode } from "./hash";
import { normalizePhoneNumber } from "./phone";

const OTP_EXPIRY_SECONDS = Number(process.env.OTP_EXPIRY_SECONDS ?? 300);
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);

/**
 * Sends a fresh LOGIN OTP over the platform's own WhatsApp number. Any
 * pending, unconsumed LOGIN code for this phone within the resend cooldown
 * is rejected before a new one is generated — prevents a client retry-loop
 * from burning through the OTP_MAX_SENDS rate limit on its own.
 */
export async function requestLoginOtp(input: { rawPhoneNumber: string; ipAddress?: string }) {
  const phoneNumber = normalizePhoneNumber(input.rawPhoneNumber);

  await checkRateLimitAndThrowError({ rateLimitingType: "sms", identifier: `login-otp:phone:${phoneNumber}` });
  if (input.ipAddress) {
    await checkRateLimitAndThrowError({ rateLimitingType: "sms", identifier: `login-otp:ip:${input.ipAddress}` });
  }

  const recent = await prisma.otpVerification.findFirst({
    where: { phoneNumber, purpose: "LOGIN", consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    const secondsSinceSent = (Date.now() - recent.createdAt.getTime()) / 1000;
    if (secondsSinceSent < OTP_RESEND_COOLDOWN_SECONDS) {
      throw new HttpError({
        statusCode: 429,
        message: `Please wait before requesting another code.`,
      });
    }
  }

  const code = generateOtpCode();
  // Send before persisting the new row — if the WhatsApp send fails, no
  // stale/unsendable code should exist for a client to try against.
  await sendPlatformWhatsAppMessage(phoneNumber, `Your verification code is ${code}. It expires in 5 minutes.`);

  await prisma.otpVerification.create({
    data: {
      phoneNumber,
      purpose: "LOGIN",
      codeHash: hashOtpCode(code),
      expiresAt: new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000),
    },
  });

  return { success: true as const, expiresIn: OTP_EXPIRY_SECONDS, resendAfter: OTP_RESEND_COOLDOWN_SECONDS };
}

/**
 * Verifies AND consumes a LOGIN code in one step — login has no separate
 * "verify then book" window like the booking-OTP flow does, so there's
 * nothing to gain from splitting verify/consume here.
 */
export async function verifyAndConsumeLoginOtp(input: { rawPhoneNumber: string; code: string }) {
  const phoneNumber = normalizePhoneNumber(input.rawPhoneNumber);

  const record = await prisma.otpVerification.findFirst({
    where: { phoneNumber, purpose: "LOGIN", consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new HttpError({ statusCode: 400, message: "That verification code has expired. Please request a new one." });
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    throw new HttpError({ statusCode: 429, message: "Too many incorrect attempts. Please request a new code." });
  }

  const isCorrect = constantTimeEqual(hashOtpCode(input.code), record.codeHash);
  if (!isCorrect) {
    await prisma.otpVerification.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw new HttpError({ statusCode: 400, message: "That verification code is incorrect." });
  }

  await prisma.otpVerification.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return { phoneNumber };
}
