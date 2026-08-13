"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import PhoneInput from "@calcom/web/components/phone-input";
import { Button } from "@calcom/ui/components/button";
import { Alert } from "@calcom/ui/components/alert";
import { TextField } from "@calcom/ui/components/form";

/**
 * Single passwordless entry point for every tenant account (Individual,
 * Organization owner, Organization staff) — used for both first-time signup
 * and returning login, since findOrCreateByPhoneNumber makes the two the
 * same server-side operation. Platform ADMIN accounts never use this; they
 * keep the separate email/password /auth/login flow.
 */
export function PhoneAuthView({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const sendCode = async () => {
    setError(undefined);
    setIsSending(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not send verification code.");
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send verification code.");
    } finally {
      setIsSending(false);
    }
  };

  const verifyAndSignIn = async () => {
    setError(undefined);
    setIsVerifying(true);
    try {
      const result = await signIn("phone-otp", { phoneNumber, otpCode: code, redirect: false, callbackUrl });
      if (result?.error) {
        setError("That verification code is incorrect or has expired.");
        return;
      }
      router.push(callbackUrl);
    } finally {
      setIsVerifying(false);
    }
  };

  if (step === "phone") {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-emphasis mb-1 block text-sm font-medium">Mobile number</label>
          <PhoneInput required value={phoneNumber} onChange={setPhoneNumber} />
        </div>
        {error && <Alert severity="error" message={error} />}
        <Button
          type="button"
          className="w-full justify-center"
          loading={isSending}
          disabled={!phoneNumber}
          onClick={sendCode}>
          Send verification code
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-subtle text-sm">
        We sent a WhatsApp code to {phoneNumber}.{" "}
        <button type="button" className="text-emphasis underline" onClick={() => setStep("phone")}>
          Wrong number?
        </button>
      </p>
      <TextField
        label="Verification code"
        name="otpCode"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      {error && <Alert severity="error" message={error} />}
      <Button
        type="button"
        className="w-full justify-center"
        loading={isVerifying}
        disabled={code.length < 4}
        onClick={verifyAndSignIn}>
        Continue
      </Button>
      <Button type="button" color="minimal" loading={isSending} onClick={sendCode}>
        Resend code
      </Button>
    </div>
  );
}
