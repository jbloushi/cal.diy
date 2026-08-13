import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requestLoginOtp } from "@calcom/lib/otp/otpService";
import getIP from "@calcom/lib/getIP";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";

const bodySchema = z.object({ phoneNumber: z.string().min(4).max(32) });

/** Sends a LOGIN OTP over the platform's own WhatsApp number. No auth required — this *is* the login/signup entry point. */
async function handler(req: NextRequest) {
  const remoteIp = getIP(req);
  try {
    const { phoneNumber } = bodySchema.parse(await parseRequestData(req));
    const result = await requestLoginOtp({ rawPhoneNumber: phoneNumber, ipAddress: remoteIp });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.statusCode });
    }
    logger.error("otp/send failed", e);
    return NextResponse.json({ message: "Could not send verification code." }, { status: 500 });
  }
}

export const POST = defaultResponderForAppDir(handler);
