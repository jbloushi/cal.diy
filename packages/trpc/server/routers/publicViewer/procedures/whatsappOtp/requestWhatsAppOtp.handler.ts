import { requestBookingOtp } from "@calcom/lib/otp/bookingVerification";
import { findWhatsAppConnectionForEventType } from "@calcom/lib/whatsapp/resolveWhatsAppConnectionForEventType";
import { HttpError } from "@calcom/lib/http-error";
import type { TRPCContextInner } from "@calcom/trpc/server/createContext";
import type { TRequestWhatsAppOtpInputSchema } from "./schema";

type Options = { input: TRequestWhatsAppOtpInputSchema; ctx: Pick<TRPCContextInner, "sourceIp"> };

// Never accepts a client-supplied connection id — always resolved from the
// event type server-side, so a booker can't probe or spoof another
// account's tenant id.
const requestWhatsAppOtpHandler = async ({ input, ctx }: Options) => {
  const connection = await findWhatsAppConnectionForEventType(input.eventTypeId);
  if (!connection) {
    throw new HttpError({ statusCode: 400, message: "This event type does not require phone verification." });
  }
  return requestBookingOtp({
    whatsAppConnectionId: connection.id,
    rawPhoneNumber: input.phoneNumber,
    ipAddress: ctx.sourceIp,
  });
};

export default requestWhatsAppOtpHandler;
