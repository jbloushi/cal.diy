import { findWhatsAppConnectionForEventType } from "@calcom/lib/whatsapp/resolveWhatsAppConnectionForEventType";

const getRequiresVerificationHandler = async ({ input }: { input: { eventTypeId: number } }) => {
  const connection = await findWhatsAppConnectionForEventType(input.eventTypeId);
  return { requiresWhatsAppVerification: !!connection };
};

export default getRequiresVerificationHandler;
