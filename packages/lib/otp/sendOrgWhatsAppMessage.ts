import { EvolutionClient } from "../whatsapp/evolutionClient";

export async function sendOrgWhatsAppMessage(instanceName: string, phoneNumberE164: string, message: string) {
  const client = new EvolutionClient();
  return client.sendTextMessage(instanceName, phoneNumberE164, message);
}
