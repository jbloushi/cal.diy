import { applyPhoneOnlyBookingFieldsForOwner } from "@calcom/features/eventtypes/lib/bookingFieldsManager";
import { assertWhatsAppConnectionAdmin } from "@calcom/lib/whatsapp/assertWhatsAppConnectionAdmin";
import { EvolutionClient } from "@calcom/lib/whatsapp/evolutionClient";
import { generateInstanceName } from "@calcom/lib/whatsapp/instanceNaming";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TWhatsAppOwnerInputSchema } from "./schema";

type Options = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TWhatsAppOwnerInputSchema;
};

/**
 * Creates the account's Evolution instance if it doesn't exist yet
 * (idempotent — reuses the existing one otherwise), then requests a QR
 * code. This is the "Connect WhatsApp" button action.
 *
 * The client polls this same mutation every few seconds while a QR is
 * being displayed (to fetch a fresh code), so a burst of near-simultaneous
 * calls for the same owner is expected — the find-then-create below isn't
 * atomic, so more than one call can pass the find step before the first
 * one's create commits. Losing that race must not surface as a 500; it
 * should just pick up the winner's row (see the P2002 catch below).
 */
const connectHandler = async ({ ctx, input }: Options) => {
  await assertWhatsAppConnectionAdmin({ userId: ctx.user.id, teamId: input.teamId ?? null });

  const where = input.teamId ? { teamId: input.teamId } : { userId: ctx.user.id };
  const client = new EvolutionClient();

  let connection = await prisma.whatsAppConnection.findUnique({ where });

  if (!connection) {
    const instanceName = generateInstanceName();
    await client.createInstance(instanceName);
    try {
      connection = await prisma.whatsAppConnection.create({
        data: { ...where, instanceName, status: "CONNECTING" },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // Lost the create race — a concurrent call already made the row.
        // The Evolution instance we just created above is now orphaned
        // (never referenced by any WhatsAppConnection row); harmless,
        // never-connected, not worth cleaning up here.
        const existing = await prisma.whatsAppConnection.findUnique({ where });
        if (!existing) throw error;
        connection = existing;
      } else {
        throw error;
      }
    }

    await applyPhoneOnlyBookingFieldsForOwner(
      input.teamId ? { teamId: input.teamId } : { userId: ctx.user.id }
    );
  }

  const qr = await client.getConnectionQr(connection.instanceName);
  await prisma.whatsAppConnection.update({
    where: { id: connection.id },
    data: { status: "QR_REQUIRED" },
  });

  return { qrCode: qr.qrCode, pairingCode: qr.pairingCode };
};

export default connectHandler;
