import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";

/**
 * Server-side authorization gate for WhatsApp connection administration
 * (Settings -> WhatsApp), for either an Individual account (teamId
 * omitted) or an Organization (teamId set). Checked against the *target
 * owner* rather than an existing connection row — a connection may not
 * exist yet the first time "Connect WhatsApp" is clicked.
 */
export async function assertWhatsAppConnectionAdmin(input: {
  userId: number;
  teamId: number | null;
}): Promise<void> {
  if (!input.teamId) {
    // Individual account: the owner is always the caller.
    return;
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: input.userId, teamId: input.teamId, accepted: true, role: { in: ["ADMIN", "OWNER"] } },
    select: { id: true },
  });
  if (!membership) {
    throw new ErrorWithCode(ErrorCode.Forbidden, "You do not have access to this account.");
  }
}
