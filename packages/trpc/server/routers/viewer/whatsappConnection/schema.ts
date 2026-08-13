import { z } from "zod";

// teamId omitted => the connection belongs to the caller themselves
// (Individual account). teamId set => the connection belongs to that
// Organization. The app has exactly these two account types.
export const ZWhatsAppOwnerInputSchema = z.object({
  teamId: z.number().optional(),
});
export type TWhatsAppOwnerInputSchema = z.infer<typeof ZWhatsAppOwnerInputSchema>;

export const ZSendTestMessageInputSchema = ZWhatsAppOwnerInputSchema.extend({
  phoneNumber: z.string().min(4).max(32),
});
export type TSendTestMessageInputSchema = z.infer<typeof ZSendTestMessageInputSchema>;
