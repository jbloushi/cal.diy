import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";

/** Server-side authorization gate for organization staff management (Settings -> Members). */
export async function assertTeamAdmin(input: { userId: number; teamId: number }): Promise<void> {
  const membership = await prisma.membership.findFirst({
    where: { userId: input.userId, teamId: input.teamId, accepted: true, role: { in: ["ADMIN", "OWNER"] } },
    select: { id: true },
  });
  if (!membership) {
    throw new ErrorWithCode(ErrorCode.Forbidden, "You do not have access to this organization.");
  }
}
