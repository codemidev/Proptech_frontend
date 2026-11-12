import Image from "next/image";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

type SignInPageProps = {
  searchParams?: Promise<{
    redirect_url?: string | string[];
    ref?: string | string[];
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = searchParams ? await searchParams : {};
  const raw = params.redirect_url;

  let redirectTarget = "/dashboard";

  if (
    typeof raw === "string" &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.includes("\\")
  ) {
    try {
      const target = new URL(raw, "https://aviritech.invalid");

      if (
        target.origin === "https://aviritech.invalid" &&
        target.pathname === "/owner/invitations/accept" &&
        target.searchParams.get("token")
      ) {
        redirectTarget = `${target.pathname}${target.search}${target.hash}`;
      }
    } catch {
      // Keep the default dashboard redirect.
    }
  }

  const rawReferral = params.ref;
  const referralCode =
    typeof rawReferral === "string" && /^[A-Z0-9]{6,20}$/i.test(rawReferral)
      ? rawReferral.toUpperCase()
      : null;

  const signUpParams = new URLSearchParams();

  if (redirectTarget !== "/dashboard") {
    signUpParams.set("redirect_url", redirectTarget);
  }

  if (referralCode) {
    signUpParams.set("ref", referralCode);
  }

  const signUpQuery = signUpParams.toString();
  const signUpUrl = signUpQuery ? `/sign-up?${signUpQuery}` : "/sign-up";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-10">
      <Link
        href="/"
        aria-label="Aviritech PropTech home"
        className="mb-8 inline-flex items-center justify-center"
      >
        <Image
          src="/brand/aviritech-logo.svg"
          alt="Aviritech PropTech"
          width={220}
          height={64}
          priority
          className="h-12 w-auto object-contain"
        />
      </Link>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl={signUpUrl}
        forceRedirectUrl={redirectTarget}
        fallbackRedirectUrl={redirectTarget}
      />
    </main>
  );
}
