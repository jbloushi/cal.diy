import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { WhatsAppSettingsView } from "~/settings/whatsapp/WhatsAppSettingsView";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "WhatsApp",
    () => "Connect your organization's WhatsApp number to send verification codes to clients booking with you.",
    undefined,
    undefined,
    "/settings/teams/whatsapp"
  );

// Route: Settings -> WhatsApp, scoped to a single Organization account.
// Membership/role authorization is re-checked server-side on every
// whatsappConnection tRPC call (assertWhatsAppConnectionAdmin) — this page
// itself only requires a signed-in session.
const WhatsAppSettingsPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isFinite(teamId)) {
    redirect("/settings/my-account/whatsapp");
  }

  return <WhatsAppSettingsView teamId={teamId} />;
};

export default WhatsAppSettingsPage;
