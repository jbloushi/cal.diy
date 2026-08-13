import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { AccountTypeStep } from "~/auth/components/AccountTypeStep";

// Every phone-otp signIn lands here first — new accounts pick Individual vs
// Organization and claim a slug; returning accounts (already onboarded)
// just pass straight through.
const AccountTypePage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { completedOnboarding: true },
  });
  if (user?.completedOnboarding) {
    redirect("/event-types");
  }

  return (
    <div className="bg-subtle flex min-h-screen items-center justify-center p-4">
      <div className="bg-default border-subtle w-full max-w-md rounded-lg border p-6">
        <AccountTypeStep />
      </div>
    </div>
  );
};

export default AccountTypePage;
