"use client";

import { useState, type FormEvent } from "react";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getClerkErrorMessage } from "@/lib/clerk-error";

export default function ForgotPasswordPage() {
  const { isLoaded, signIn } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isLoaded) return;

    setError(null);
    setSubmitting(true);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      sessionStorage.setItem("reset_email", email);
      router.push("/forgot-password/verify");
    } catch (err) {
      setError(getClerkErrorMessage(err, "Unable to send reset code"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold">Forgot Password?</h1>
        <p className="mt-1 text-sm text-black/50">
          Enter your email address and we&apos;ll send you a code to reset your
          password
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Enter your email address"
            required
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-brand-yellow"
          />

          {error && <p className="text-sm text-status-danger-fg">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Continue"}
          </Button>
        </form>
      </div>
    </main>
  );
}
