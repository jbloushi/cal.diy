import { normalizePhoneNumber } from "@calcom/lib/otp/phone";
import { assertWhatsAppConnectionAdmin } from "@calcom/lib/whatsapp/assertWhatsAppConnectionAdmin";
import { EvolutionClient } from "@calcom/lib/whatsapp/evolutionClient";
import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TSendTestMessageInputSchema } from "./schema";

type Options = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TSendTestMessageInputSchema;
};

const sendTestMessageHandler = async ({ ctx, input }: Options) => {
  await assertWhatsAppConnectionAdmin({ userId: ctx.user.id, teamId: input.teamId ?? null });

  const where = input.teamId ? { teamId: input.teamId } : { userId: ctx.user.id };
  const connection = await prisma.whatsAppConnection.findUnique({ where });
  if (!connection || connection.status !== "CONNECTED") {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect WhatsApp before sending a test message." });
  }

  const phoneNumber = normalizePhoneNumber(input.phoneNumber);
  const client = new EvolutionClient();
  await client.sendTextMessage(connection.instanceName, phoneNumber, "This is a test message from Cal.diy.");

  return { success: true };
};

export default sendTestMessageHandler;
