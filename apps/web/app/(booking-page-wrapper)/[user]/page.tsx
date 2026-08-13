import { WEBAPP_URL } from "@calcom/lib/constants";
import { getOrgDirectory } from "@calcom/lib/slug/getOrgDirectory";
import { resolveSlugOwner } from "@calcom/lib/slug/resolveSlugOwner";
import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/[user]/getServerSideProps";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import type React from "react";
import { OrgDirectoryView } from "~/organizations/OrgDirectoryView";
import type { PageProps as LegacyPageProps } from "~/users/views/users-public-view";
import LegacyPage from "~/users/views/users-public-view";

const getData: (ctx: ReturnType<typeof buildLegacyCtx>) => Promise<LegacyPageProps> =
  withAppDirSsr<LegacyPageProps>(getServerSideProps);

// Individuals and Organizations share one flat top-level namespace
// (platform.com/{slug}, no /team/ or /org/ prefix) — this route resolves
// the bare slug first. A "+"-joined value (dynamic group booking, e.g.
// "alice+bob") is always multiple individual usernames, never an
// Organization slug, so the org check is skipped for those.
const ServerPage = async ({ params, searchParams }: PageProps): Promise<JSX.Element> => {
  const resolvedParams = decodeParams(await params);
  const rawSlug = Array.isArray(resolvedParams.user) ? resolvedParams.user[0] : resolvedParams.user;

  if (rawSlug && !rawSlug.includes("+")) {
    const owner = await resolveSlugOwner(rawSlug);
    if (owner?.type === "TEAM") {
      const directory = await getOrgDirectory(owner.teamId);
      if (!directory) notFound();
      return <OrgDirectoryView team={directory.team} members={directory.members} />;
    }
  }

  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  return <LegacyPage {...props} />;
};

export const generateMetadata = async ({ params, searchParams }: PageProps): Promise<Metadata> => {
  const resolvedParams = decodeParams(await params);
  const rawSlug = Array.isArray(resolvedParams.user) ? resolvedParams.user[0] : resolvedParams.user;
  if (rawSlug && !rawSlug.includes("+")) {
    const owner = await resolveSlugOwner(rawSlug);
    if (owner?.type === "TEAM") {
      const directory = await getOrgDirectory(owner.teamId);
      return { title: directory?.team.name ?? rawSlug };
    }
  }

  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  const { profile, markdownStrippedBio, isOrgSEOIndexable } = props;
  const isOrg = !!profile?.organization;
  const allowSEOIndexing =
    (!isOrg && profile.allowSEOIndexing) || (isOrg && isOrgSEOIndexable && profile.allowSEOIndexing);

  const meeting = {
    title: markdownStrippedBio,
    profile: { name: `${profile.name}`, image: profile.image },
    users: [{ username: `${profile.username}`, name: `${profile.name}` }],
  };
  const metadata = await generateMeetingMetadata(
    meeting,
    () => profile.name,
    () => markdownStrippedBio,
    false,
    WEBAPP_URL,
    `/${decodeParams(await params).user}`
  );

  return {
    ...metadata,
    robots: {
      follow: allowSEOIndexing,
      index: allowSEOIndexing,
    },
  };
};

export default ServerPage;
