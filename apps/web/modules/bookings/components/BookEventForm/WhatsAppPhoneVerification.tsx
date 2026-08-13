import { useEffect, useState } from "react";

import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";

type Props = {
  eventTypeId: number;
  /** ISO string with explicit timezone offset (e.g. dayjs(date).format()) — must match what actually gets submitted. */
  bookingStartIso: string;
  phoneNumber: string | undefined;
};

/**
 * Shown instead of/alongside the phone field when the event type's owner
 * has WhatsApp connected. Verification is bound to the exact phone number
 * and time slot (see packages/lib/otp/bookingVerification.ts) — the
 * resulting token is stored in the Booker store and cleared automatically
 * whenever the phone number or slot changes (see BookEventForm.tsx), so a
 * stale verification can never be silently reused for a different booking.
 */
export function WhatsAppPhoneVerification({ eventTypeId, bookingStartIso, phoneNumber }: Props) {
  const token = useBookerStoreContext((state) => state.phoneVerificationToken);
  const setToken = useBookerStoreContext((state) => state.setPhoneVerificationToken);
  const [code, setCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const requestOtpMutation = trpc.viewer.public.requestWhatsAppOtp.useMutation({
    onSuccess: () => setShowCodeInput(true),
    onError: (err: { message: string }) => setError(err.message),
  });

  const verifyOtpMutation = trpc.viewer.public.verifyWhatsAppOtp.useMutation({
    onSuccess: (data: { verificationToken: string }) => {
      setToken(data.verificationToken);
      setShowCodeInput(false);
    },
    onError: (err: { message: string }) => setError(err.message),
  });

  // A verified token exists but the phone/slot it was for no longer
  // matches — the client changed something after verifying. Reset the UI
  // rather than silently keep showing "verified" for a stale context; the
  // server would reject the stale token anyway (bound context hash), this
  // just avoids the confusing "verified" state hanging around.
  useEffect(() => {
    if (token && showCodeInput) setShowCodeInput(false);
  }, [phoneNumber, bookingStartIso]); // eslint-disable-line react-hooks/exhaustive-deps

  if (token) {
    return <Alert severity="info" message="Phone number verified." />;
  }

  return (
    <div className="border-subtle mt-2 space-y-2 rounded-md border p-3">
      {!showCodeInput ? (
        <Button
          type="button"
          color="secondary"
          size="sm"
          loading={requestOtpMutation.isPending}
          disabled={!phoneNumber}
          onClick={() => {
            setError(undefined);
            if (phoneNumber) requestOtpMutation.mutate({ eventTypeId, phoneNumber });
          }}>
          Send WhatsApp verification code
        </Button>
      ) : (
        <div className="flex items-end gap-2">
          <TextField
            containerClassName="flex-1"
            label="Verification code"
            name="whatsappOtpCode"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            loading={verifyOtpMutation.isPending}
            disabled={code.length < 4 || !phoneNumber}
            onClick={() => {
              setError(undefined);
              if (phoneNumber) {
                verifyOtpMutation.mutate({ eventTypeId, phoneNumber, code, bookingStartIso });
              }
            }}>
            Verify
          </Button>
          <Button
            type="button"
            color="minimal"
            size="sm"
            loading={requestOtpMutation.isPending}
            onClick={() => {
              setError(undefined);
              if (phoneNumber) requestOtpMutation.mutate({ eventTypeId, phoneNumber });
            }}>
            Resend code
          </Button>
        </div>
      )}
      {error && <Alert severity="error" message={error} />}
    </div>
  );
}
