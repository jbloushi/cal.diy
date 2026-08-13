import { z } from "zod";

export const ZRequestWhatsAppOtpInputSchema = z.object({
  eventTypeId: z.number(),
  phoneNumber: z.string().min(4).max(32),
});
export type TRequestWhatsAppOtpInputSchema = z.infer<typeof ZRequestWhatsAppOtpInputSchema>;

export const ZVerifyWhatsAppOtpInputSchema = z.object({
  eventTypeId: z.number(),
  phoneNumber: z.string().min(4).max(32),
  code: z.string().min(4).max(10),
  bookingStartIso: z.string(),
});
export type TVerifyWhatsAppOtpInputSchema = z.infer<typeof ZVerifyWhatsAppOtpInputSchema>;

export const ZGetRequiresVerificationInputSchema = z.object({
  eventTypeId: z.number(),
});
export type TGetRequiresVerificationInputSchema = z.infer<typeof ZGetRequiresVerificationInputSchema>;
