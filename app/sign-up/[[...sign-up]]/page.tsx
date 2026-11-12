"use client";

import Image from "next/image";

import { useEffect, useState, type FormEvent } from "react";
import { useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RoleOptionCard } from "@/components/auth/RoleOptionCard";
import { getClerkErrorMessage } from "@/lib/clerk-error";
import { roleOptions as roles } from "@/lib/roles";

type Step = "role" | "details" | "verify";

const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-500 focus:border-brand-yellow";

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<Step>("role");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [redirectTarget, setRedirectTarget] = useState("/auth/provision");
  const [isInvitationSignup, setIsInvitationSignup] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const referral = searchParams.get("ref");

    if (referral && /^[A-Z0-9]{6,20}$/i.test(referral)) {
      sessionStorage.setItem("signup_referral_code", referral.toUpperCase());
    } else {
      sessionStorage.removeItem("signup_referral_code");
    }

    const raw = searchParams.get("redirect_url");
    if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\\\")) return;
    try {
      const target = new URL(raw, window.location.origin);
      if (target.origin !== window.location.origin || target.pathname !== "/owner/invitations/accept" || !target.searchParams.get("token")) return;
      const safeTarget = `${target.pathname}${target.search}${target.hash}`;
      setRedirectTarget(safeTarget);
      setIsInvitationSignup(true);
      sessionStorage.removeItem("signup_referral_code");
      setStep("details");
      sessionStorage.removeItem("signup_role");
    } catch {
      return;
    }
  }, []);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectRole = (value: string) => {
    sessionStorage.setItem("signup_role", value);
    setSelectedRole(value);
    setStep("details");
  };

  const handleOAuth = async (strategy: "oauth_google" | "oauth_apple") => {
    if (!isLoaded) return;

    try {
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sign-up/sso-callback",
        redirectUrlComplete: redirectTarget,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to continue with that provider",
      );
    }
  };

  const handleCreateAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (!isLoaded) return;

    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!agreedToTerms) {
      setError("Please agree to the Terms and Conditions to continue");
      return;
    }

    setSubmitting(true);

    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err) {
      setError(getClerkErrorMessage(err, "Unable to create your account"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (!isLoaded) return;

    setError(null);
    setSubmitting(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push(redirectTarget);
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err) {
      setError(getClerkErrorMessage(err, "Invalid verification code"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-white px-4 py-10 text-neutral-900 [color-scheme:light] sm:px-6">
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
      {/* Mount point Clerk's bot-protection (Smart CAPTCHA) attaches to in custom flows.
          Must exist unconditionally from first render — Clerk initializes it on mount,
          before the user ever reaches a specific step. */}
      <div id="clerk-captcha" />
      {step === "role" && (
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-xl font-bold">Choose Your Role</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Select the option that best describes you
          </p>

          <div className="mt-6 space-y-3" role="group" aria-label="Account role">
            {roles.map((item) => (
              <RoleOptionCard
                key={item.value}
                option={item}
                selected={selectedRole === item.value}
                onSelect={selectRole}
              />
            ))}
          </div>
        </div>
      )}

      {step === "details" && (
        <div className="mx-auto w-full max-w-sm">
          {!isInvitationSignup && (
            <button
              type="button"
              onClick={() => setStep("role")}
              className="mb-4 text-sm text-neutral-600"
            >
              ← Back
            </button>
          )}

          <h1 className="text-xl font-bold">Create Your Account</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Join thousands of property owners and agents
          </p>

          <form onSubmit={handleCreateAccount} className="mt-6 space-y-3">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              required
              className={inputClass}
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              required
              className={inputClass}
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email address"
              required
              className={inputClass}
            />
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="new-password"
                required
                minLength={8}
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-xl text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-yellow"
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            <div className="relative">
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
                autoComplete="new-password"
                required
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                aria-pressed={showConfirmPassword}
                className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-xl text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-yellow"
              >
                {showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>

            <label className="flex items-start gap-2 text-xs text-black/60">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5"
              />
              I agree to the Terms and Conditions
            </label>

            {error && <p className="text-sm text-status-danger-fg">{error}</p>}

            <Button type="submit" disabled={submitting || !isLoaded}>
              {submitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Creating account...
                </span>
              ) : "Create Account"}
            </Button>
</form>

          <div className="mt-4 flex flex-col gap-3">
            <Button variant="secondary" onClick={() => handleOAuth("oauth_google")}>
              Continue with Google
            </Button>
            <Button variant="secondary" onClick={() => handleOAuth("oauth_apple")}>
              Continue with Apple
            </Button>
          </div>
        </div>
      )}

      {step === "verify" && (
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-xl font-bold">Verify Your Account</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Enter the 6-digit code sent to {email}
          </p>

          <form onSubmit={handleVerify} className="mt-6 space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              required
              className={`${inputClass} text-center text-lg tracking-[0.5em]`}
            />

            {error && <p className="text-sm text-status-danger-fg">{error}</p>}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Verifying..." : "Verify"}
            </Button>
          </form>
        </div>
      )}

      <p className="mx-auto mt-8 w-full max-w-sm text-center text-sm text-black/60">
        Already have an account?{" "}
        <Link href={isInvitationSignup ? `/sign-in?redirect_url=${encodeURIComponent(redirectTarget)}` : "/sign-in"} className="font-semibold text-black underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  );
}
