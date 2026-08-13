import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

/** Server-side authorization gate for organization staff management (Settings -> Members). */
export async function assertTeamAdmin(input: { userId: number; teamId: number }): Promise<void> {
  const membership = await MembershipRepository.getAdminOrOwnerMembership(input.userId, input.teamId);
  if (!membership) {
    throw new ErrorWithCode(ErrorCode.Forbidden, "You do not have access to this organization.");
  }
}
