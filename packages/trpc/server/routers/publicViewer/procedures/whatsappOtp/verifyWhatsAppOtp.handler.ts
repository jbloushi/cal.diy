import { verifyBookingOtp } from "@calcom/lib/otp/bookingVerification";
import { findWhatsAppConnectionForEventType } from "@calcom/lib/whatsapp/resolveWhatsAppConnectionForEventType";
import { HttpError } from "@calcom/lib/http-error";
import type { TVerifyWhatsAppOtpInputSchema } from "./schema";

type Options = { input: TVerifyWhatsAppOtpInputSchema };

const verifyWhatsAppOtpHandler = async ({ input }: Options) => {
  const connection = await findWhatsAppConnectionForEventType(input.eventTypeId);
  if (!connection) {
    throw new HttpError({ statusCode: 400, message: "This event type does not require phone verification." });
  }
  return verifyBookingOtp({
    whatsAppConnectionId: connection.id,
    rawPhoneNumber: input.phoneNumber,
    code: input.code,
    eventTypeId: input.eventTypeId,
    bookingStartIso: input.bookingStartIso,
  });
};

export default verifyWhatsAppOtpHandler;
