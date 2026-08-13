import type { Prisma, PrismaClient } from "@calcom/prisma/client";

import { HttpError } from "../http-error";
import { isReservedSlug } from "./reservedSlugs";

const SLUG_FORMAT = /^[a-z0-9-]{1,64}$/;

export function validateSlugFormat(slug: string) {
  if (!SLUG_FORMAT.test(slug)) {
    throw new HttpError({
      statusCode: 400,
      message: "Use lowercase letters, numbers, and hyphens only (max 64 characters).",
    });
  }
  if (isReservedSlug(slug)) {
    throw new HttpError({ statusCode: 409, message: "That URL is reserved. Please choose another." });
  }
}

/**
 * Registers a slug against its owner (a User or a Team/Organization) inside
 * an existing transaction. Must be called alongside the actual
 * User.username update / Team.create in the SAME transaction — otherwise a
 * race could let two signups land on the same slug in the moment between
 * the check and the entity write.
 */
export async function registerSlug(
  tx: Prisma.TransactionClient | PrismaClient,
  input: { slug: string; ownerType: "USER" | "TEAM"; ownerId: number }
) {
  validateSlugFormat(input.slug);

  try {
    await tx.slugRegistry.create({ data: input });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new HttpError({ statusCode: 409, message: "That URL is already taken." });
    }
    throw error;
  }
}
