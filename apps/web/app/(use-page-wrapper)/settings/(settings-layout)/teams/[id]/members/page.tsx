import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { OrgMembersView } from "~/settings/organizations/OrgMembersView";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Members",
    () => "Manage your organization's staff.",
    undefined,
    undefined,
    "/settings/teams/members"
  );

// Route: Settings -> Members, scoped to a single Organization. Real
// authorization is re-checked server-side on every organizations tRPC call
// (assertTeamAdmin) — this page itself only requires a signed-in session.
const OrgMembersPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isFinite(teamId)) {
    redirect("/event-types");
  }

  return <OrgMembersView teamId={teamId} />;
};

export default OrgMembersPage;
