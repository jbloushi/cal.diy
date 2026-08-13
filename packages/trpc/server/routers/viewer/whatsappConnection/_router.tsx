import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZSendTestMessageInputSchema, ZWhatsAppOwnerInputSchema } from "./schema";

// WhatsApp connection administration (Settings -> WhatsApp), for either an
// Individual account (teamId omitted) or an Organization (teamId set).
// Every procedure re-checks authorization server-side via
// assertWhatsAppConnectionAdmin — never rely on the UI hiding controls.
export const whatsappConnectionRouter = router({
  connect: authedProcedure.input(ZWhatsAppOwnerInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./connect.handler");
    return handler(opts);
  }),

  getStatus: authedProcedure.input(ZWhatsAppOwnerInputSchema).query(async (opts) => {
    const { default: handler } = await import("./getStatus.handler");
    return handler(opts);
  }),

  disconnect: authedProcedure.input(ZWhatsAppOwnerInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./disconnect.handler");
    return handler(opts);
  }),

  sendTestMessage: authedProcedure.input(ZSendTestMessageInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./sendTestMessage.handler");
    return handler(opts);
  }),
});
