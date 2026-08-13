import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { whatsappConnectionRouter } from "@calcom/trpc/server/routers/viewer/whatsappConnection/_router";

export default createNextApiHandler(whatsappConnectionRouter);
