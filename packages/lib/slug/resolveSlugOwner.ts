import prisma from "@calcom/prisma";

export type SlugOwner =
  | { type: "USER"; userId: number }
  | { type: "TEAM"; teamId: number };

/**
 * Resolves a bare top-level slug (platform.com/{slug}) against the shared
 * User/Organization namespace. Returns null if nothing claims it (falls
 * through to the normal "not found" handling).
 *
 * Note: for USER-owned slugs this is a pointer to whatever username the
 * account had when it first claimed the slug (see
 * packages/lib/slug/claimSlug.ts) — if a user later changes their username
 * via the existing account settings page, SlugRegistry is not currently
 * updated to match. That's a known gap, not something this resolver can
 * fix; the settings username-change flow would need its own update to
 * SlugRegistry to close it.
 */
export async function resolveSlugOwner(slug: string): Promise<SlugOwner | null> {
  const entry = await prisma.slugRegistry.findUnique({
    where: { slug },
    select: { ownerType: true, ownerId: true },
  });
  if (!entry) return null;
  return entry.ownerType === "USER" ? { type: "USER", userId: entry.ownerId } : { type: "TEAM", teamId: entry.ownerId };
}
