import publicProcedure from "../../procedures/publicProcedure";
import { router } from "../../trpc";
import { ZUserEmailVerificationRequiredSchema } from "./checkIfUserEmailVerificationRequired.schema";
import { ZMarkHostAsNoShowInputSchema } from "./markHostAsNoShow.schema";
import { event } from "./procedures/event";
import {
  ZGetRequiresVerificationInputSchema,
  ZRequestWhatsAppOtpInputSchema,
  ZVerifyWhatsAppOtpInputSchema,
} from "./procedures/whatsappOtp/schema";
import { ZSubmitRatingInputSchema } from "./submitRating.schema";

// things that unauthenticated users can query about themselves
export const publicViewerRouter = router({
  countryCode: publicProcedure.query(async (opts) => {
    const { default: handler } = await import("./countryCode.handler");
    return handler(opts);
  }),
  submitRating: publicProcedure.input(ZSubmitRatingInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./submitRating.handler");
    return handler(opts);
  }),
  markHostAsNoShow: publicProcedure.input(ZMarkHostAsNoShowInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./markHostAsNoShow.handler");
    return handler(opts);
  }),
  event,

  checkIfUserEmailVerificationRequired: publicProcedure
    .input(ZUserEmailVerificationRequiredSchema)
    .query(async (opts) => {
      const { default: handler } = await import("./checkIfUserEmailVerificationRequired.handler");
      return handler(opts);
    }),

  requestWhatsAppOtp: publicProcedure.input(ZRequestWhatsAppOtpInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./procedures/whatsappOtp/requestWhatsAppOtp.handler");
    return handler(opts);
  }),

  verifyWhatsAppOtp: publicProcedure.input(ZVerifyWhatsAppOtpInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./procedures/whatsappOtp/verifyWhatsAppOtp.handler");
    return handler(opts);
  }),

  getRequiresWhatsAppVerification: publicProcedure
    .input(ZGetRequiresVerificationInputSchema)
    .query(async (opts) => {
      const { default: handler } = await import("./procedures/whatsappOtp/getRequiresVerification.handler");
      return handler(opts);
    }),
});
