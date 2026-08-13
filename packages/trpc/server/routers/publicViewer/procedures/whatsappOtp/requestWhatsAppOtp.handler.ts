import { requestBookingOtp } from "@calcom/lib/otp/bookingVerification";
import { findWhatsAppConnectionForEventType } from "@calcom/lib/whatsapp/resolveWhatsAppConnectionForEventType";
import { HttpError } from "@calcom/lib/http-error";
import type { TRequestWhatsAppOtpInputSchema } from "./schema";

type Options = { input: TRequestWhatsAppOtpInputSchema };

// Never accepts a client-supplied connection id — always resolved from the
// event type server-side, so a booker can't probe or spoof another
// account's tenant id.
const requestWhatsAppOtpHandler = async ({ input }: Options) => {
  const connection = await findWhatsAppConnectionForEventType(input.eventTypeId);
  if (!connection) {
    throw new HttpError({ statusCode: 400, message: "This event type does not require phone verification." });
  }
  return requestBookingOtp({ whatsAppConnectionId: connection.id, rawPhoneNumber: input.phoneNumber });
};

export default requestWhatsAppOtpHandler;
