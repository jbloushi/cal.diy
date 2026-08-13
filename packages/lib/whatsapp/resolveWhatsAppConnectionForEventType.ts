import prisma from "@calcom/prisma";

/**
 * The app has exactly two account types: an Individual (a personal
 * EventType with `userId` set, `teamId` null) or an Organization
 * (`teamId` set). Mirrors the existing EventType.userId/teamId XOR
 * ownership already used throughout booking logic — no new concept here.
 */
export type EventTypeOwner = { type: "user"; userId: number } | { type: "team"; teamId: number };

export async function resolveEventTypeOwner(eventTypeId: number): Promise<EventTypeOwner | null> {
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
    select: { userId: true, teamId: true },
  });
  if (!eventType) return null;
  if (eventType.teamId) return { type: "team", teamId: eventType.teamId };
  if (eventType.userId) return { type: "user", userId: eventType.userId };
  return null;
}

export async function findWhatsAppConnectionForOwner(owner: EventTypeOwner) {
  return prisma.whatsAppConnection.findUnique({
    where: owner.type === "team" ? { teamId: owner.teamId } : { userId: owner.userId },
  });
}

export async function findWhatsAppConnectionForEventType(eventTypeId: number) {
  const owner = await resolveEventTypeOwner(eventTypeId);
  if (!owner) return null;
  return findWhatsAppConnectionForOwner(owner);
}
