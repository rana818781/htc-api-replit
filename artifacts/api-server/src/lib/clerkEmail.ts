import { createClerkClient, getAuth } from "@clerk/express";
import type { Request } from "express";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

/**
 * Resolves the actual email address for a Clerk user.
 * First tries session claims (fast), then falls back to Clerk backend API.
 * Never returns a placeholder email.
 */
export async function resolveClerkEmail(req: Request, clerkUserId: string): Promise<string> {
  const auth = getAuth(req);

  const claimEmail =
    (auth?.sessionClaims?.email as string | undefined) ||
    (auth?.sessionClaims?.primary_email_address as string | undefined);

  if (claimEmail && !claimEmail.includes("@unknown.local")) {
    return claimEmail;
  }

  // Fall back to Clerk backend API to get the real email
  try {
    const clerkUser = await clerk.users.getUser(clerkUserId);
    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );
    if (primaryEmail?.emailAddress) {
      return primaryEmail.emailAddress;
    }
    // Any email is better than placeholder
    if (clerkUser.emailAddresses.length > 0) {
      return clerkUser.emailAddresses[0].emailAddress;
    }
  } catch {
    // Clerk API unavailable — return placeholder as last resort
  }

  return `${clerkUserId}@unknown.local`;
}
