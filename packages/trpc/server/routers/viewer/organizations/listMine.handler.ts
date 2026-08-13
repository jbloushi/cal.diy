import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type Options = {
  ctx: { user: NonNullable<TrpcSessionUser> };
};

// Powers the settings sidebar's "Organization" nav entry — every org the
// caller belongs to (owner or staff), regardless of accepted status, so a
// still-pending staff member can find their way to the org too.
const listMineHandler = async ({ ctx }: Options) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: ctx.user.id },
    select: { role: true, team: { select: { id: true, name: true, slug: true } } },
    orderBy: { id: "asc" },
  });

  return memberships.map((m) => ({
    id: m.team.id,
    name: m.team.name,
    slug: m.team.slug,
    role: m.role,
  }));
};

export default listMineHandler;
