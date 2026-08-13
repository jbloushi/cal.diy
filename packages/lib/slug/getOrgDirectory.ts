import prisma from "@calcom/prisma";

export async function getOrgDirectory(teamId: number) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, slug: true, bio: true, logoUrl: true },
  });
  if (!team) return null;

  const memberships = await prisma.membership.findMany({
    where: { teamId, accepted: true },
    select: {
      role: true,
      user: { select: { id: true, name: true, username: true, avatarUrl: true, bio: true } },
    },
    orderBy: { role: "asc" },
  });

  return {
    team,
    // Member-only booking (confirmed product decision): a visitor picks a
    // specific staff member and books their individual page directly —
    // members without a username yet (haven't finished their own
    // account-type step) can't be booked, so they're filtered out here
    // rather than rendered as a dead link.
    members: memberships.filter((m) => !!m.user.username).map((m) => ({ ...m.user, role: m.role })),
  };
}
