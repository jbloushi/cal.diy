import { z } from "zod";

export const ZTeamIdInputSchema = z.object({ teamId: z.number() });
export type TTeamIdInputSchema = z.infer<typeof ZTeamIdInputSchema>;

export const ZAddStaffMemberInputSchema = z.object({
  teamId: z.number(),
  name: z.string().min(1).max(255),
  phoneNumber: z.string().min(4).max(32),
  role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
});
export type TAddStaffMemberInputSchema = z.infer<typeof ZAddStaffMemberInputSchema>;

export const ZRemoveMemberInputSchema = z.object({
  teamId: z.number(),
  userId: z.number(),
});
export type TRemoveMemberInputSchema = z.infer<typeof ZRemoveMemberInputSchema>;
