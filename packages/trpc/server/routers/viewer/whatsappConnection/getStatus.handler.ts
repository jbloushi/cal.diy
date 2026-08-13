import { assertWhatsAppConnectionAdmin } from "@calcom/lib/whatsapp/assertWhatsAppConnectionAdmin";
import { EvolutionClient } from "@calcom/lib/whatsapp/evolutionClient";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TWhatsAppOwnerInputSchema } from "./schema";

type Options = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TWhatsAppOwnerInputSchema;
};

const getStatusHandler = async ({ ctx, input }: Options) => {
  await assertWhatsAppConnectionAdmin({ userId: ctx.user.id, teamId: input.teamId ?? null });

  const where = input.teamId ? { teamId: input.teamId } : { userId: ctx.user.id };
  const connection = await prisma.whatsAppConnection.findUnique({ where });
  if (!connection) {
    return { status: "DISCONNECTED" as const, connectedNumber: null, lastConnectedAt: null };
  }

  // Live-check against Evolution rather than trusting our cached status —
  // the phone could have unlinked the device since our last sync, and
  // there's no delivery-guaranteed webhook to catch that reliably.
  const client = new EvolutionClient();
  const live = await client.getConnectionStatus(connection.instanceName);
  const status = live.status === "connected" ? "CONNECTED" : live.status === "connecting" ? "CONNECTING" : "ERROR";

  if (status !== connection.status || live.connectedNumber !== connection.connectedNumber) {
    await prisma.whatsAppConnection.update({
      where: { id: connection.id },
      data: {
        status,
        connectedNumber: live.connectedNumber ?? null,
        lastConnectedAt: status === "CONNECTED" ? new Date() : connection.lastConnectedAt,
      },
    });
  }

  return {
    status,
    connectedNumber: live.connectedNumber ?? connection.connectedNumber,
    lastConnectedAt: connection.lastConnectedAt,
  };
};

export default getStatusHandler;
