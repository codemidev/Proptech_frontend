"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getClerkErrorMessage } from "@/lib/clerk-error";

const checks = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  {
    label: "One number and special character",
    test: (v: string) => /\d/.test(v) && /[^A-Za-z0-9]/.test(v),
  },
];

export default function ResetPasswordPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCode(sessionStorage.getItem("reset_code") ?? "");
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isLoaded) return;

    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        sessionStorage.removeItem("reset_email");
        sessionStorage.removeItem("reset_code");
        router.push("/forgot-password/success");
      } else {
        setError("Unable to reset password. Please try again.");
      }
    } catch (err) {
      setError(getClerkErrorMessage(err, "Unable to reset password"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold">Create New Password</h1>
        <p className="mt-1 text-sm text-black/50">
          Your new password must be different from your previously used
          password
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="New password"
            required
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-brand-yellow"
          />
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            placeholder="Confirm password"
            required
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-brand-yellow"
          />

          <ul className="space-y-1.5 rounded-xl bg-gray-50 p-3">
            {checks.map((check) => {
              const passed = check.test(password);
              return (
                <li
                  key={check.label}
                  className={`flex items-center gap-2 text-xs ${
                    passed ? "text-status-success-fg" : "text-black/40"
                  }`}
                >
                  {passed ? <Check size={14} /> : <X size={14} />}
                  {check.label}
                </li>
              );
            })}
          </ul>

          {error && <p className="text-sm text-status-danger-fg">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Updating..." : "Continue"}
          </Button>
        </form>
      </div>
    </main>
  );
}
