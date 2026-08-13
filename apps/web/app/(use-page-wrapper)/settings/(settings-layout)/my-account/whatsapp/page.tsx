import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { WhatsAppSettingsView } from "~/settings/whatsapp/WhatsAppSettingsView";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "WhatsApp",
    () => "Connect your WhatsApp number to send verification codes to clients booking with you.",
    undefined,
    undefined,
    "/settings/my-account/whatsapp"
  );

// Route: Settings -> WhatsApp, scoped to the caller's own Individual
// account (no teamId). Authorization is re-checked server-side on every
// whatsappConnection tRPC call (assertWhatsAppConnectionAdmin) — this page
// itself only requires a signed-in session.
const WhatsAppMyAccountSettingsPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return <WhatsAppSettingsView />;
};

export default WhatsAppMyAccountSettingsPage;
