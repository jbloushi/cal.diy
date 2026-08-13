import Link from "next/link";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";

export type OrgDirectoryProps = {
  team: { name: string; slug: string | null; bio: string | null; logoUrl: string | null };
  members: { id: number; name: string | null; username: string | null; avatarUrl: string | null; bio: string | null }[];
};

/**
 * The public page for an Organization's bare top-level slug
 * (platform.com/{slug}) — a member directory, not a single booking form.
 * A visitor picks a specific staff member here and is taken to that
 * member's own individual booking page; there is no "book whoever's free"
 * option (member-only booking, confirmed product decision for v1).
 */
export function OrgDirectoryView({ team, members }: OrgDirectoryProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10 flex flex-col items-center text-center">
        {team.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logoUrl} alt={team.name} className="mb-4 h-16 w-16 rounded-full" />
        )}
        <h1 className="font-cal text-2xl">{team.name}</h1>
        {team.bio && <p className="text-subtle mt-1 max-w-md text-sm">{team.bio}</p>}
      </div>

      {members.length === 0 ? (
        <p className="text-subtle text-center">No one is available to book right now.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/${member.username}`}
              className="border-subtle hover:border-emphasis flex items-center gap-4 rounded-lg border p-4 transition">
              {/* eslint-disable-next-line @next/next/no-img-element -- static server-rendered directory, no client component needed */}
              <img
                src={getUserAvatarUrl({ avatarUrl: member.avatarUrl })}
                alt={member.name ?? member.username ?? ""}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <div className="text-emphasis font-medium">{member.name ?? member.username}</div>
                {member.bio && <div className="text-subtle text-sm">{member.bio}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
