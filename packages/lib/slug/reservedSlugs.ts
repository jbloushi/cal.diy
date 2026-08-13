/**
 * Top-level route segments that must never be claimable as a username or
 * Organization slug — both compete for the same bare `/{slug}` namespace
 * (see packages/lib/slug/claimSlug.ts), so anything that collides with a
 * real app route would make that route permanently unreachable.
 *
 * Compiled from the actual top-level segments under
 * apps/web/app/(use-page-wrapper)/ and apps/web/app/(booking-page-wrapper)/
 * — keep in sync if a new top-level route is ever added.
 */
export const RESERVED_SLUGS = new Set([
  "api",
  "apps",
  "auth",
  "availability",
  "booking",
  "booking-successful",
  "d",
  "enterprise",
  "event-types",
  "getting-started",
  "maintenance",
  "more",
  "onboarding",
  "payment",
  "refer",
  "reschedule",
  "settings",
  "signup",
  "upgrade",
  "video",
  "team",
  "org",
  "success",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
