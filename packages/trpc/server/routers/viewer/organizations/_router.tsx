import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAddStaffMemberInputSchema, ZRemoveMemberInputSchema, ZTeamIdInputSchema } from "./schema";

// Organization staff management (Settings -> Members). Every procedure
// re-checks authorization server-side via assertTeamAdmin — never rely on
// the UI hiding controls. Team/Organization creation itself happens during
// signup (see /api/auth/complete-profile), not here.
export const organizationsRouter = router({
  listMine: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./listMine.handler");
    return handler(opts);
  }),

  listMembers: authedProcedure.input(ZTeamIdInputSchema).query(async (opts) => {
    const { default: handler } = await import("./listMembers.handler");
    return handler(opts);
  }),

  addStaffMember: authedProcedure.input(ZAddStaffMemberInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./addStaffMember.handler");
    return handler(opts);
  }),

  removeMember: authedProcedure.input(ZRemoveMemberInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./removeMember.handler");
    return handler(opts);
  }),
});
