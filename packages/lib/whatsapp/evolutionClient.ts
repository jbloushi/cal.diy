import process from "node:process";

import logger from "../logger";
import { WhatsAppError } from "./errors";

const log = logger.getSubLogger({ prefix: ["EvolutionClient"] });

// Confirmed against evolution-api v2.3.7 (src/api/controllers/instance.controller.ts,
// src/api/routes/instance.router.ts, src/api/dto/sendMessage.dto.ts).
const EVOLUTION_INTEGRATION_WHATSAPP_BAILEYS = "WHATSAPP-BAILEYS";

export type EvolutionConnectionState = "connecting" | "connected" | "disconnected" | "error";

function mapConnectionState(state: string | undefined): EvolutionConnectionState {
  switch (state) {
    case "open":
      return "connected";
    case "connecting":
      return "connecting";
    case "close":
      return "disconnected";
    default:
      return "error";
  }
}

/**
 * Thin, low-level client for a single self-hosted Evolution API deployment,
 * authenticated with the global API key. Every method scopes to one
 * `instanceName` — callers are responsible for ensuring that instance
 * belongs to the requesting account (enforced by the caller, not here).
 * Server-side only.
 */
export class EvolutionClient {
  private readonly baseUrl: string;
  private readonly globalApiKey: string;
  private readonly timeoutMs: number;

  constructor(opts?: { baseUrl?: string; globalApiKey?: string; timeoutMs?: number }) {
    const baseUrl = opts?.baseUrl ?? process.env.EVOLUTION_API_BASE_URL;
    const globalApiKey = opts?.globalApiKey ?? process.env.EVOLUTION_API_GLOBAL_KEY;

    if (!baseUrl || !globalApiKey) {
      throw new Error("EvolutionClient requires EVOLUTION_API_BASE_URL and EVOLUTION_API_GLOBAL_KEY.");
    }

    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.globalApiKey = globalApiKey;
    this.timeoutMs = opts?.timeoutMs ?? Number(process.env.EVOLUTION_API_REQUEST_TIMEOUT_MS ?? 10000);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", apikey: this.globalApiKey, ...init?.headers },
      });
    } catch (error) {
      log.error("Evolution API request failed", { path, error: (error as Error).message });
      throw new WhatsAppError("WHATSAPP_PROVIDER_UNAVAILABLE", { cause: error as Error });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 404) throw new WhatsAppError("WHATSAPP_INSTANCE_NOT_FOUND");
    if (!response.ok) {
      log.error("Evolution API returned an error status", { path, status: response.status });
      throw new WhatsAppError("WHATSAPP_PROVIDER_UNAVAILABLE");
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      log.error("Evolution API returned a non-JSON response", { path });
      throw new WhatsAppError("WHATSAPP_PROVIDER_UNAVAILABLE", { cause: error as Error });
    }
  }

  async createInstance(instanceName: string) {
    const data = await this.request<{ instance?: { instanceName: string; status?: string } }>(
      "/instance/create",
      {
        method: "POST",
        body: JSON.stringify({
          instanceName,
          integration: EVOLUTION_INTEGRATION_WHATSAPP_BAILEYS,
          qrcode: true,
        }),
      }
    );
    return { instanceName: data.instance?.instanceName ?? instanceName };
  }

  async getConnectionQr(instanceName: string) {
    const data = await this.request<{
      qrcode?: { base64?: string; pairingCode?: string };
      base64?: string;
      pairingCode?: string;
    }>(`/instance/connect/${encodeURIComponent(instanceName)}`);
    const qr = data.qrcode ?? (data.base64 || data.pairingCode ? data : undefined);
    return { qrCode: qr?.base64, pairingCode: qr?.pairingCode };
  }

  async getConnectionStatus(instanceName: string) {
    const data = await this.request<{ instance?: { state?: string; number?: string } }>(
      `/instance/connectionState/${encodeURIComponent(instanceName)}`
    );
    return { status: mapConnectionState(data.instance?.state), connectedNumber: data.instance?.number };
  }

  async disconnectInstance(instanceName: string) {
    // Evolution's /instance/logout errors (observed: 500) when there's no
    // live session to log out of — e.g. the phone already unlinked the
    // device. That's not a failure from our side, so check first and treat
    // an already-dead session as a successful disconnect rather than
    // propagating an error the user can't do anything about.
    const current = await this.getConnectionStatus(instanceName);
    if (current.status !== "connected" && current.status !== "connecting") return;

    await this.request(`/instance/logout/${encodeURIComponent(instanceName)}`, { method: "DELETE" });
  }

  async deleteInstance(instanceName: string) {
    await this.request(`/instance/delete/${encodeURIComponent(instanceName)}`, { method: "DELETE" });
  }

  async sendTextMessage(instanceName: string, phoneNumber: string, message: string) {
    try {
      const data = await this.request<{ key?: { id?: string } }>(
        `/message/sendText/${encodeURIComponent(instanceName)}`,
        { method: "POST", body: JSON.stringify({ number: phoneNumber, text: message }) }
      );
      return { messageId: data.key?.id };
    } catch (error) {
      if (error instanceof WhatsAppError) throw error;
      throw new WhatsAppError("WHATSAPP_SEND_FAILED", { cause: error as Error });
    }
  }
}
