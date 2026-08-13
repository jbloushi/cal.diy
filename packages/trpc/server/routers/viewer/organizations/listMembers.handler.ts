import { assertTeamAdmin } from "@calcom/lib/teams/assertTeamAdmin";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TTeamIdInputSchema } from "./schema";

type Options = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TTeamIdInputSchema;
};

/** Owner/Admin only — keeps member phone numbers private from plain staff. */
const listMembersHandler = async ({ ctx, input }: Options) => {
  await assertTeamAdmin({ userId: ctx.user.id, teamId: input.teamId });

  const memberships = await prisma.membership.findMany({
    where: { teamId: input.teamId },
    select: {
      role: true,
      accepted: true,
      user: { select: { id: true, name: true, phoneNumber: true } },
    },
    orderBy: [{ accepted: "desc" }, { role: "asc" }],
  });

  return memberships.map((m) => ({ ...m.user, role: m.role, accepted: m.accepted }));
};

export default listMembersHandler;
