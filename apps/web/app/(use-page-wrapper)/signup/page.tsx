import { _generateMetadata } from "app/_utils";
import Link from "next/link";

import { PhoneAuthView } from "~/auth/components/PhoneAuthView";

export const generateMetadata = async () =>
  await _generateMetadata((t) => t("sign_up"), (t) => t("sign_up"), undefined, undefined, "/signup");

// Every tenant account (Individual, Organization owner, Organization
// staff) signs up and logs in the same way — phone + WhatsApp OTP. There is
// no separate email/password signup path anymore for tenants; that
// remains only for platform ADMIN accounts via /auth/login.
const SignupPage = () => {
  return (
    <div className="bg-subtle flex min-h-screen items-center justify-center p-4">
      <div className="bg-default border-subtle w-full max-w-md rounded-lg border p-6">
        <h1 className="font-cal mb-1 text-2xl">Create your account</h1>
        <p className="text-subtle mb-6 text-sm">We&apos;ll text you a code on WhatsApp — no password needed.</p>
        <PhoneAuthView callbackUrl="/getting-started/account-type" />
        <p className="text-subtle mt-6 text-sm">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-emphasis underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
