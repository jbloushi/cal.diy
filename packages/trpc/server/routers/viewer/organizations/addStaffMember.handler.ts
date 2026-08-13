import { getUserRepository } from "@calcom/features/di/containers/UserRepository";
import { assertTeamAdmin } from "@calcom/lib/teams/assertTeamAdmin";
import { normalizePhoneNumber } from "@calcom/lib/otp/phone";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { CreationSource, IdentityProvider, MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TAddStaffMemberInputSchema } from "./schema";

type Options = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TAddStaffMemberInputSchema;
};

/**
 * Owner-provisioning for org staff: the owner sets a name + phone number
 * directly, no email/password. The Membership is created `accepted: false`
 * — the staff member's own first successful phone-OTP login (see
 * authorizePhoneOtp in next-auth-options.ts) is what flips it to accepted,
 * matching the confirmed "staff self-verifies via OTP" design. Until then
 * the owner sees them as pending and can revoke via removeMember.
 */
const addStaffMemberHandler = async ({ ctx, input }: Options) => {
  await assertTeamAdmin({ userId: ctx.user.id, teamId: input.teamId });

  const phoneNumber = normalizePhoneNumber(input.phoneNumber);
  const existingUser = await prisma.user.findUnique({ where: { phoneNumber }, select: { id: true } });
  if (existingUser) {
    const existingMembership = await prisma.membership.findUnique({
      where: { userId_teamId: { userId: existingUser.id, teamId: input.teamId } },
    });
    if (existingMembership) {
      throw new TRPCError({ code: "CONFLICT", message: "This phone number is already on the team." });
    }
  }

  const userRepository = getUserRepository();
  let userId: number;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const placeholderEmail = `${phoneNumber.replace(/[^0-9]/g, "")}@phone.invalid`;
    try {
      const user = await userRepository.create({
        phoneNumber,
        name: input.name,
        email: placeholderEmail,
        username: null,
        organizationId: null,
        creationSource: CreationSource.WEBAPP,
        identityProvider: IdentityProvider.CAL,
        locked: false,
        // Staff never go through the Individual/Organization account-type
        // step — they're joining an existing org directly.
        completedOnboarding: true,
      });
      userId = user.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new TRPCError({ code: "CONFLICT", message: "A user with that phone number already exists." });
      }
      throw error;
    }
  }

  const membership = await prisma.membership.create({
    data: {
      teamId: input.teamId,
      userId,
      role: input.role === "ADMIN" ? MembershipRole.ADMIN : MembershipRole.MEMBER,
      accepted: false,
    },
  });

  return membership;
};

export default addStaffMemberHandler;
