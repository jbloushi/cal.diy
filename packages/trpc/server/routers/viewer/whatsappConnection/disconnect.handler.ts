import { assertWhatsAppConnectionAdmin } from "@calcom/lib/whatsapp/assertWhatsAppConnectionAdmin";
import { EvolutionClient } from "@calcom/lib/whatsapp/evolutionClient";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TWhatsAppOwnerInputSchema } from "./schema";

const log = logger.getSubLogger({ prefix: ["whatsappConnection.disconnect"] });

type Options = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TWhatsAppOwnerInputSchema;
};

const disconnectHandler = async ({ ctx, input }: Options) => {
  await assertWhatsAppConnectionAdmin({ userId: ctx.user.id, teamId: input.teamId ?? null });

  const where = input.teamId ? { teamId: input.teamId } : { userId: ctx.user.id };
  const connection = await prisma.whatsAppConnection.findUnique({ where });
  if (!connection) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No WhatsApp connection to disconnect." });
  }

  // Best-effort upstream teardown. Evolution/Baileys' reported state can lag
  // or race the real socket (observed: connectionState says "open" while
  // logout itself throws "Connection Closed", and a merely logged-out
  // instance can get stuck refusing to issue a fresh QR because Evolution
  // still considers it linked). Deleting the instance outright — rather
  // than just logging out — is what actually clears that zombied state.
  // The user's intent is "stop using this connection", which we can always
  // satisfy on our side even if the third-party instance was already dead
  // or the delete call itself flakes, so never let that block us.
  try {
    const client = new EvolutionClient();
    await client.deleteInstance(connection.instanceName);
  } catch (error) {
    log.warn("Upstream instance delete failed, clearing local connection state anyway", {
      instanceName: connection.instanceName,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Delete rather than mark QR_REQUIRED: the Evolution instance is gone (or
  // was already unusable), so the next "Connect" must create a brand new
  // instance + QR from scratch, not retry against the old instanceName.
  await prisma.whatsAppConnection.delete({ where: { id: connection.id } });

  return { success: true };
};

export default disconnectHandler;
