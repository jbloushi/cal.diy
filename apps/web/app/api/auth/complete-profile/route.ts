import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import { cookies, headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { registerSlug, validateSlugFormat } from "@calcom/lib/slug/claimSlug";
import prisma from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const bodySchema = z.discriminatedUnion("accountType", [
  z.object({ accountType: z.literal("INDIVIDUAL"), username: z.string(), name: z.string().min(1) }),
  z.object({
    accountType: z.literal("ORGANIZATION"),
    slug: z.string(),
    orgName: z.string().min(1),
    name: z.string().min(1),
  }),
]);

/**
 * The one-time step after a brand-new passwordless account's first login:
 * choose Individual (claim a username) or Organization (name + claim a
 * slug, caller becomes OWNER). Both paths claim a slug from the same shared
 * SlugRegistry namespace in the same transaction as the entity write, so
 * two concurrent signups can never land on the same slug.
 */
async function handler(req: NextRequest) {
  try {
    const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const input = bodySchema.parse(await parseRequestData(req));
    validateSlugFormat(input.accountType === "INDIVIDUAL" ? input.username : input.slug);

    if (input.accountType === "INDIVIDUAL") {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: session.user.id },
          data: { username: input.username, name: input.name, completedOnboarding: true },
        });
        await registerSlug(tx, { slug: input.username, ownerType: "USER", ownerId: session.user.id });
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const team = await tx.team.create({ data: { name: input.orgName, slug: input.slug } });
        await tx.membership.create({
          data: { teamId: team.id, userId: session.user.id, role: "OWNER", accepted: true },
        });
        await tx.user.update({
          where: { id: session.user.id },
          data: { name: input.name, completedOnboarding: true },
        });
        await registerSlug(tx, { slug: input.slug, ownerType: "TEAM", ownerId: team.id });
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.statusCode });
    }
    // A concurrent signup can win the race and claim the same slug between
    // our pre-check and this write — Team.slug's own unique index (and, for
    // the Individual path, User's username/organizationId index) throws
    // P2002 first, before ever reaching SlugRegistry's own uniqueness
    // check, so this must be caught here too, not just in registerSlug.
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ message: "That URL is already taken." }, { status: 409 });
    }
    logger.error("complete-profile failed", e);
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export const POST = defaultResponderForAppDir(handler);
