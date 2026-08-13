import { HttpError } from "../http-error";

export type WhatsAppErrorCode =
  | "WHATSAPP_PROVIDER_UNAVAILABLE"
  | "WHATSAPP_INSTANCE_NOT_FOUND"
  | "WHATSAPP_SEND_FAILED"
  | "WHATSAPP_NOT_CONNECTED";

const SAFE_MESSAGES: Record<WhatsAppErrorCode, string> = {
  WHATSAPP_PROVIDER_UNAVAILABLE: "WhatsApp verification is temporarily unavailable. Please try again shortly.",
  WHATSAPP_INSTANCE_NOT_FOUND: "WhatsApp connection not found for this account.",
  WHATSAPP_SEND_FAILED: "We couldn't send the WhatsApp message. Please try again shortly.",
  WHATSAPP_NOT_CONNECTED: "WhatsApp verification is temporarily unavailable. Please try again shortly.",
};

const STATUS_CODES: Record<WhatsAppErrorCode, number> = {
  WHATSAPP_PROVIDER_UNAVAILABLE: 503,
  WHATSAPP_INSTANCE_NOT_FOUND: 404,
  WHATSAPP_SEND_FAILED: 502,
  WHATSAPP_NOT_CONNECTED: 503,
};

export class WhatsAppError extends HttpError {
  public readonly code: WhatsAppErrorCode;

  constructor(code: WhatsAppErrorCode, opts?: { cause?: Error }) {
    super({ statusCode: STATUS_CODES[code], message: SAFE_MESSAGES[code], cause: opts?.cause });
    // HttpError's constructor unconditionally sets its own prototype, which
    // discards this subclass's prototype chain — restore it so
    // `instanceof WhatsAppError` checks work at every call site.
    Object.setPrototypeOf(this, WhatsAppError.prototype);
    this.name = "WhatsAppError";
    this.code = code;
  }
}
