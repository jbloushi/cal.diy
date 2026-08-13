"use client";

import { useState } from "react";

import PhoneInput from "@calcom/web/components/phone-input";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type Member = { id: number; name: string | null; phoneNumber: string | null; role: string; accepted: boolean };

export function OrgMembersView({ teamId }: { teamId: number }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const membersQuery = trpc.viewer.organizations.listMembers.useQuery({ teamId });

  const addStaffMutation = trpc.viewer.organizations.addStaffMember.useMutation({
    onSuccess: () => {
      showToast("Staff member added — share the number with them so they can log in.", "success");
      setName("");
      setPhoneNumber("");
      utils.viewer.organizations.listMembers.invalidate({ teamId });
    },
    onError: (error: { message: string }) => showToast(error.message, "error"),
  });

  const removeMutation = trpc.viewer.organizations.removeMember.useMutation({
    onSuccess: () => {
      showToast("Removed", "success");
      utils.viewer.organizations.listMembers.invalidate({ teamId });
    },
    onError: (error: { message: string }) => showToast(error.message, "error"),
  });

  if (membersQuery.isPending) return <SkeletonText className="h-32 w-full" />;
  if (membersQuery.isError) {
    return <Alert severity="error" message="You don't have access to view this team's members." />;
  }

  return (
    <div className="space-y-4">
      <div className="border-subtle rounded-lg border p-4">
        <h3 className="text-emphasis font-medium">Members</h3>
        <ul className="mt-2 divide-y divide-subtle">
          {membersQuery.data?.map((member: Member) => (
            <li key={member.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-emphasis text-sm font-medium">{member.name ?? "Unnamed"}</div>
                <div className="text-subtle text-xs">{member.phoneNumber}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={member.accepted ? "success" : "orange"}>
                  {member.accepted ? member.role : "Pending"}
                </Badge>
                <Button
                  type="button"
                  color="destructive"
                  size="sm"
                  loading={removeMutation.isPending}
                  onClick={() => removeMutation.mutate({ teamId, userId: member.id })}>
                  {member.accepted ? "Remove" : "Cancel invite"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-subtle rounded-lg border p-4">
        <h3 className="text-emphasis font-medium">Add a staff member</h3>
        <p className="text-subtle mt-1 text-sm">
          Enter their name and phone number — they'll log in themselves with a WhatsApp code, no password
          to set up.
        </p>
        <div className="mt-3 space-y-3">
          <TextField label="Full name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <label className="text-emphasis mb-1 block text-sm font-medium">Mobile number</label>
            <PhoneInput value={phoneNumber} onChange={setPhoneNumber} />
          </div>
          <Button
            type="button"
            loading={addStaffMutation.isPending}
            disabled={!name || !phoneNumber}
            onClick={() => addStaffMutation.mutate({ teamId, name, phoneNumber })}>
            Add staff member
          </Button>
        </div>
      </div>
    </div>
  );
}
