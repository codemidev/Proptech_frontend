"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

type VerifyResponse = {
  success: boolean;
  message?: string;
  data?: { status?: "SUCCESS" | "FAILED" };
};

export default function ContractPaymentCallbackPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const started = useRef(false);
  const [message, setMessage] = useState("Verifying your payment...");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;

    if (!isSignedIn) {
      setMessage("Sign in with the owner account that initiated this payment to verify it.");
      return;
    }

    let active = true;

    async function verify() {
      const params = new URLSearchParams(window.location.search);
      const reference = params.get("tx_ref") || params.get("reference") || "";
      const transactionId =
        params.get("transaction_id") || params.get("id") || "";
      const gatewayStatus = (params.get("status") || "").toLowerCase();
      const inspectionId = params.get("inspectionId") || "";

      if (gatewayStatus === "cancelled") {
        setMessage("Payment was cancelled. Return to Tenant Applications to retry lease setup.");
        return;
      }
      if (!reference || !transactionId || !inspectionId) {
        setMessage("The payment return is missing required details. Check payment status before retrying.");
        return;
      }

      try {
        const verificationQuery = new URLSearchParams({ reference });
        if (transactionId) {
          verificationQuery.set("transactionId", transactionId);
        }

        const result = await apiFetch<VerifyResponse>(
          `/api/v1/payments/verify?${verificationQuery.toString()}`,
          getToken,
        );

        if (!active) return;
        if (!result.success || result.data?.status !== "SUCCESS") {
          setMessage(result.message || "Payment could not be confirmed. Return to Tenant Applications and check its status before retrying.");
          return;
        }

        setVerified(true);
        const draftKey = `aviritech:lease-setup:${inspectionId}`;
        const rawDraft = sessionStorage.getItem(draftKey);

        if (!rawDraft) {
          setMessage("Payment confirmed. Saved lease terms were not found in this browser session. Reopen lease setup and check the application before retrying; do not pay again.");
          return;
        }

        try {
          const draft = JSON.parse(rawDraft) as {
            inspectionId?: string;
            startDate?: string;
            endDate?: string;
            rentFrequency?: string;
            rentAmount?: number;
            securityDeposit?: number;
          };

          if (
            draft.inspectionId !== inspectionId ||
            !draft.startDate ||
            !draft.endDate ||
            !draft.rentFrequency ||
            !Number.isFinite(draft.rentAmount) ||
            Number(draft.rentAmount) <= 0 ||
            new Date(draft.endDate).getTime() <= new Date(draft.startDate).getTime()
          ) {
            throw new Error("Saved lease terms are incomplete or invalid.");
          }

          await apiFetch("/api/v1/leases", getToken, {
            method: "POST",
            body: JSON.stringify({
              ...draft,
              startDate: new Date(`${draft.startDate}T00:00:00`).toISOString(),
              endDate: new Date(`${draft.endDate}T00:00:00`).toISOString(),
            }),
          });

          if (!active) return;
          sessionStorage.removeItem(draftKey);
          setMessage("Payment verified and lease setup submitted. The tenant can reload My Applications to view the contract and explicitly accept it.");
        } catch (error) {
          if (!active) return;
          setMessage(
            error instanceof Error
              ? `Payment is confirmed, but lease creation needs attention: ${error.message} Saved terms are retained. Return to Tenant Applications and retry without paying again.`
              : "Payment is confirmed, but lease creation failed. Saved terms are retained; retry without paying again.",
          );
        }
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Unable to verify payment. Check payment status before retrying.");
      }
    }

    void verify();
    return () => { active = false; };
  }, [getToken, isLoaded, isSignedIn]);

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Aviritech PropTech</p>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Lease contract setup payment</h1>
        <p role="status" className="mt-4 text-sm leading-6 text-gray-600">{message}</p>
        {verified && <p className="mt-3 text-sm text-green-700">Payment confirmed for the owner account that initiated it.</p>}
        <Link href="/dashboard/owner/tenant-applications" className="mt-6 inline-flex rounded-lg bg-yellow-400 px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-yellow-300">
          Return to Tenant Applications
        </Link>
      </section>
    </main>
  );
}
