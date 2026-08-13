import { assertTeamAdmin } from "@calcom/lib/teams/assertTeamAdmin";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TRemoveMemberInputSchema } from "./schema";

type Options = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TRemoveMemberInputSchema;
};

/** Also used to revoke a still-pending (not yet self-verified) invite. */
const removeMemberHandler = async ({ ctx, input }: Options) => {
  await assertTeamAdmin({ userId: ctx.user.id, teamId: input.teamId });

  const target = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: input.userId, teamId: input.teamId } },
  });
  if (!target) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That member is not on this team." });
  }

  if (target.role === MembershipRole.OWNER) {
    const ownerCount = await prisma.membership.count({
      where: { teamId: input.teamId, role: MembershipRole.OWNER, accepted: true },
    });
    if (ownerCount <= 1) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "A team must have at least one owner." });
    }
  }

  await prisma.membership.delete({
    where: { userId_teamId: { userId: input.userId, teamId: input.teamId } },
  });

  return { success: true };
};

export default removeMemberHandler;
