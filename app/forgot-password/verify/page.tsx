"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getClerkErrorMessage } from "@/lib/clerk-error";

const RESEND_SECONDS = 45;

export default function VerifyResetCodePage() {
  const { isLoaded, signIn } = useSignIn();
  const router = useRouter();

  // sessionStorage is browser-only; reading it during render (even lazily)
  // would mismatch Next's server-rendered markup, so this is read post-mount.
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmail(sessionStorage.getItem("reset_email") ?? "");
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleResend = async () => {
    if (!isLoaded || secondsLeft > 0) return;

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(getClerkErrorMessage(err, "Unable to resend code"));
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError("Enter the 6-digit code sent to your email");
      return;
    }

    sessionStorage.setItem("reset_code", code);
    router.push("/forgot-password/reset");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold">Verify OTP</h1>
        <p className="mt-1 text-sm text-black/50">
          Enter the 6-digit code sent to {email || "your email address"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            required
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-center text-lg tracking-[0.5em] outline-none focus:border-brand-yellow"
          />

          {error && <p className="text-sm text-status-danger-fg">{error}</p>}

          <Button type="submit">Verify</Button>

          <button
            type="button"
            onClick={handleResend}
            disabled={secondsLeft > 0}
            className="w-full text-center text-xs text-black/50 disabled:text-black/30"
          >
            {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
          </button>
        </form>
      </div>
    </main>
  );
}
