"use client";

import { useEffect, useState } from "react";

import PhoneInput from "@calcom/web/components/phone-input";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

const QR_POLL_INTERVAL_MS = 3000;
const STATUS_POLL_INTERVAL_MS = 5000;
const CONNECTED_POLL_INTERVAL_MS = 30000;

const UNOFFICIAL_CONNECTION_WARNING =
  "QR WhatsApp connection uses WhatsApp Linked Devices. The connection may disconnect and may require " +
  "scanning a new QR code. For high-volume or business-critical messaging, the official Meta WhatsApp Cloud API is recommended.";

// teamId omitted => connects the caller's own (Individual) account.
export function WhatsAppSettingsView({ teamId }: { teamId?: number }) {
  const utils = trpc.useUtils();
  const owner = { teamId };

  const [qrCode, setQrCode] = useState<string | undefined>();
  const [isConnecting, setIsConnecting] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");

  const statusQuery = trpc.viewer.whatsappConnection.getStatus.useQuery(owner, {
    refetchInterval: (query: { state: { data?: { status?: string } } }) =>
      query.state.data?.status === "CONNECTED" ? CONNECTED_POLL_INTERVAL_MS : STATUS_POLL_INTERVAL_MS,
  });

  const connectMutation = trpc.viewer.whatsappConnection.connect.useMutation({
    onSuccess: (data: { qrCode?: string; pairingCode?: string }) => {
      setQrCode(data.qrCode);
      setIsConnecting(true);
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
      setIsConnecting(false);
    },
  });

  const disconnectMutation = trpc.viewer.whatsappConnection.disconnect.useMutation({
    onSuccess: () => {
      showToast("WhatsApp disconnected", "success");
      utils.viewer.whatsappConnection.getStatus.invalidate(owner);
    },
    onError: (error: { message: string }) => showToast(error.message, "error"),
  });

  const sendTestMessageMutation = trpc.viewer.whatsappConnection.sendTestMessage.useMutation({
    onSuccess: () => showToast("Test message sent", "success"),
    onError: (error: { message: string }) => showToast(error.message, "error"),
  });

  useEffect(() => {
    if (!isConnecting) return;
    if (statusQuery.data?.status === "CONNECTED") {
      setIsConnecting(false);
      return;
    }
    const interval = setInterval(() => {
      connectMutation.mutate(owner);
    }, QR_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnecting, teamId, statusQuery.data?.status]);

  if (statusQuery.isPending) {
    return <SkeletonText className="h-32 w-full" />;
  }

  const status = statusQuery.data?.status ?? "DISCONNECTED";

  return (
    <div className="space-y-4">
      <Alert severity="neutral" title="About this connection" message={UNOFFICIAL_CONNECTION_WARNING} />

      {status === "CONNECTED" && (
        <div className="border-subtle rounded-lg border p-4">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="success">Connected</Badge>
          </div>
          <dl className="text-subtle space-y-1 text-sm">
            <div>
              <dt className="text-emphasis inline font-medium">Number: </dt>
              <dd className="inline">{statusQuery.data?.connectedNumber ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-emphasis inline font-medium">Last connected: </dt>
              <dd className="inline">
                {statusQuery.data?.lastConnectedAt
                  ? new Date(statusQuery.data.lastConnectedAt).toLocaleString()
                  : "—"}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="max-w-xs">
              <label className="text-emphasis mb-1 block text-sm font-medium">Test mobile number</label>
              <PhoneInput value={testPhoneNumber} onChange={setTestPhoneNumber} />
            </div>
            <Button
              type="button"
              color="secondary"
              loading={sendTestMessageMutation.isPending}
              disabled={!testPhoneNumber}
              onClick={() => sendTestMessageMutation.mutate({ ...owner, phoneNumber: testPhoneNumber })}>
              Send test message
            </Button>
            <Button
              type="button"
              color="secondary"
              onClick={() => {
                setQrCode(undefined);
                setIsConnecting(true);
                connectMutation.mutate(owner);
              }}>
              Reconnect
            </Button>
            <Button
              type="button"
              color="destructive"
              loading={disconnectMutation.isPending}
              onClick={() => disconnectMutation.mutate(owner)}>
              Disconnect
            </Button>
          </div>
        </div>
      )}

      {status !== "CONNECTED" && !isConnecting && (
        <div className="border-subtle rounded-lg border p-4">
          <h3 className="text-emphasis font-medium">WhatsApp connection</h3>
          <p className="text-subtle mt-1 text-sm">
            Connect your WhatsApp number to send verification codes to clients booking with you.
          </p>
          {status === "ERROR" && (
            <Alert
              className="mt-3"
              severity="error"
              title="WhatsApp is disconnected"
              message="Client verification codes cannot currently be delivered."
            />
          )}
          <Button
            className="mt-3"
            type="button"
            loading={connectMutation.isPending}
            onClick={() => {
              setIsConnecting(true);
              connectMutation.mutate(owner);
            }}>
            Connect WhatsApp
          </Button>
        </div>
      )}

      {isConnecting && status !== "CONNECTED" && (
        <div className="border-subtle rounded-lg border p-4" aria-live="polite">
          <h3 className="text-emphasis font-medium">Scan this QR code</h3>
          <ol className="text-subtle mt-1 list-inside list-decimal space-y-0.5 text-sm">
            <li>Open WhatsApp on your phone.</li>
            <li>Open Settings or the three-dot menu.</li>
            <li>Select Linked Devices.</li>
            <li>Select Link a device.</li>
            <li>Scan this QR code.</li>
          </ol>

          <div className="mt-4 flex flex-col items-center gap-3">
            {qrCode ? (
              // eslint-disable-next-line @next/next/no-img-element -- QR is a data: URI from Evolution API, never remote/untrusted HTML.
              <img
                src={qrCode}
                alt="WhatsApp connection QR code"
                className="border-subtle h-56 w-56 rounded-md border bg-white p-2"
              />
            ) : (
              <SkeletonText className="h-56 w-56" />
            )}
            <p className="text-subtle text-xs" role="status">
              This code refreshes automatically. Waiting for scan…
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                color="secondary"
                loading={connectMutation.isPending}
                onClick={() => connectMutation.mutate(owner)}>
                Refresh QR
              </Button>
              <Button type="button" color="minimal" onClick={() => setIsConnecting(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
