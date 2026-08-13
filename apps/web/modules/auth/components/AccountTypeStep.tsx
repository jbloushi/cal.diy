"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@calcom/ui/components/button";
import { Alert } from "@calcom/ui/components/alert";
import { TextField } from "@calcom/ui/components/form";

type AccountType = "INDIVIDUAL" | "ORGANIZATION";

export function AccountTypeStep() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [accountType, setAccountType] = useState<AccountType | undefined>();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

  const submit = async () => {
    if (!accountType) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      const body =
        accountType === "INDIVIDUAL"
          ? { accountType, username: slug, name }
          : { accountType, slug, orgName, name };
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Something went wrong.");
      await updateSession();
      router.push("/event-types");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!accountType) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="font-cal text-2xl">How will you use this?</h1>
        <button
          type="button"
          className="border-subtle hover:border-emphasis rounded-lg border p-4 text-left"
          onClick={() => setAccountType("INDIVIDUAL")}>
          <div className="font-medium">Individual</div>
          <div className="text-subtle text-sm">One account, your own booking page.</div>
        </button>
        <button
          type="button"
          className="border-subtle hover:border-emphasis rounded-lg border p-4 text-left"
          onClick={() => setAccountType("ORGANIZATION")}>
          <div className="font-medium">Organization</div>
          <div className="text-subtle text-sm">
            One public page for your whole team — clients pick a staff member and book them directly.
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" className="text-subtle w-fit text-sm underline" onClick={() => setAccountType(undefined)}>
        ← Back
      </button>
      <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
      {accountType === "ORGANIZATION" && (
        <TextField
          label="Organization name"
          value={orgName}
          onChange={(e) => {
            setOrgName(e.target.value);
            if (!slug) setSlug(slugify(e.target.value));
          }}
          required
        />
      )}
      <TextField
        label="URL"
        addOnLeading="platform.com/"
        value={slug}
        onChange={(e) => setSlug(slugify(e.target.value))}
        required
      />
      {error && <Alert severity="error" message={error} />}
      <Button
        type="button"
        className="w-full justify-center"
        loading={isSubmitting}
        disabled={!slug || !name || (accountType === "ORGANIZATION" && !orgName)}
        onClick={submit}>
        Continue
      </Button>
    </div>
  );
}
