import process from "node:process";

import { EvolutionClient } from "./evolutionClient";

/**
 * The single, platform-owned WhatsApp connection used to send LOGIN OTPs for
 * signup/login (Individuals, Organizations, and their staff). One fixed
 * Evolution instance, configured once via env — not a per-tenant, QR-connect
 * flow like an Organization's own WhatsApp connection (see
 * packages/lib/whatsapp/OrgWhatsAppProvider.ts, Phase 4). An admin connects
 * this instance out-of-band (scan the QR once via the Evolution API/manager
 * directly) — there is no in-app UI for it, since there's only ever one.
 */
let client: EvolutionClient | undefined;

function getClient(): EvolutionClient {
  if (!client) client = new EvolutionClient();
  return client;
}

function getInstanceName(): string {
  const instanceName = process.env.PLATFORM_WHATSAPP_INSTANCE_NAME;
  if (!instanceName) {
    throw new Error("PLATFORM_WHATSAPP_INSTANCE_NAME must be set to send login OTPs.");
  }
  return instanceName;
}

export async function sendPlatformWhatsAppMessage(phoneNumberE164: string, message: string) {
  return getClient().sendTextMessage(getInstanceName(), phoneNumberE164, message);
}

export async function getPlatformWhatsAppStatus() {
  return getClient().getConnectionStatus(getInstanceName());
}
