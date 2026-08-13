import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

/**
 * Server-side authorization gate for WhatsApp connection administration
 * (Settings -> WhatsApp), for either an Individual account (teamId
 * omitted) or an Organization (teamId set). Checked against the *target
 * owner* rather than an existing connection row — a connection may not
 * exist yet the first time "Connect WhatsApp" is clicked.
 */
export async function assertWhatsAppConnectionAdmin(input: {
  userId: number;
  teamId: number | null;
}): Promise<void> {
  if (!input.teamId) {
    // Individual account: the owner is always the caller.
    return;
  }

  const membership = await MembershipRepository.getAdminOrOwnerMembership(input.userId, input.teamId);
  if (!membership) {
    throw new ErrorWithCode(ErrorCode.Forbidden, "You do not have access to this account.");
  }
}
