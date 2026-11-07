"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type VerificationState =
  | "verifying"
  | "success"
  | "failed";

export default function LandVaultPaymentCallback() {
  const { getToken } = useAuth();
  const [state, setState] =
    useState<VerificationState>("verifying");
  const [message, setMessage] = useState(
    "Verifying your LandVault payment...",
  );

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const params = new URLSearchParams(window.location.search);

      const landVaultId =
        params.get("landVaultId") || "";

      const reference =
        params.get("tx_ref") || "";

      const transactionId =
        params.get("transaction_id") || "";

      const paymentStatus =
        params.get("status") || "";

      if (!landVaultId) {
        if (!cancelled) {
          setState("failed");
          setMessage(
            "The LandVault ID is missing from the payment callback.",
          );
        }
        return;
      }

      if (
        !reference ||
        !transactionId ||
        paymentStatus.toLowerCase() !== "successful"
      ) {
        if (!cancelled) {
          setState("failed");
          setMessage(
            "The payment was not returned as successful.",
          );
        }
        return;
      }

      try {
        const result = await apiFetch<{
          success?: boolean;
          data?: {
            status?: string;
          };
        }>(
          `/api/v1/payments/verify?reference=${encodeURIComponent(
            reference,
          )}&transactionId=${encodeURIComponent(
            transactionId,
          )}`,
          getToken,
          {
            method: "GET",
          },
        );

        const verifiedStatus =
          result?.data?.status || "";

        if (
          !result?.success ||
          verifiedStatus.toUpperCase() !== "SUCCESS"
        ) {
          throw new Error(
            "Payment verification did not return SUCCESS.",
          );
        }

        if (!cancelled) {
          setState("success");
          setMessage(
            "Your LandVault payment has been confirmed. Owner completion is now unlocked.",
          );
        }
      } catch (error) {
        console.error(
          "LandVault payment verification failed:",
          error,
        );

        if (!cancelled) {
          setState("failed");
          setMessage(
            "We could not verify the payment yet. Please try again.",
          );
        }
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "verifying") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border p-8 text-center">
          <h1 className="text-2xl font-semibold">
            Verifying LandVault payment
          </h1>
          <p className="mt-3 text-sm opacity-70">
            {message}
          </p>
        </div>
      </main>
    );
  }

  if (state === "failed") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border p-8">
          <h1 className="text-2xl font-semibold">
            Payment verification failed
          </h1>

          <p className="mt-3 text-sm opacity-70">
            {message}
          </p>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border px-4 py-2"
            >
              Try again
            </button>

            <Link
              href="/dashboard/owner/properties/new"
              className="rounded-lg border px-4 py-2"
            >
              Return to LandVault
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border p-8">
        <div className="text-sm font-medium">
          PAYMENT CONFIRMED
        </div>

        <h1 className="mt-2 text-2xl font-semibold">
          LandVault payment confirmed
        </h1>

        <p className="mt-3 text-sm opacity-70">
          {message}
        </p>

        <div className="mt-6 rounded-xl border p-5">
          <div className="text-sm font-medium">
            Verification status
          </div>

          <div className="mt-2 text-sm opacity-70">
            Owner completion required
          </div>

          <div className="mt-4 text-sm">
            Blockchain anchor:{" "}
            <span className="font-medium">
              Pending
            </span>
          </div>
        </div>

        <Link
          href={`/dashboard/owner/land-vault/${encodeURIComponent(
            new URLSearchParams(window.location.search).get("landVaultId") || "",
          )}`}
          className="mt-6 inline-flex rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-slate-950"
        >
          Continue to Owner Completion
        </Link>
      </div>
    </main>
  );
}
