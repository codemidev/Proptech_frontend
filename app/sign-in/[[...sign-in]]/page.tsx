import Image from "next/image";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
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
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
        fallbackRedirectUrl="/dashboard"
      />
    </main>
  );
}
