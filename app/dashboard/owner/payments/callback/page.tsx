"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { Button } from "@/components/ui/Button";

type VerifyResponse = {
  success: boolean;
  data: {
    status: "SUCCESS" | "FAILED";
  };
};

function CallbackContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const searchParams = useSearchParams();

  const [state, setState] = useState<
    "loading" | "success" | "failed" | "error"
  >("loading");

  const [message, setMessage] = useState<string | null>(null);

  /**
   * Prevent duplicate verification/submission caused by effect re-runs,
   * React Strict Mode, or searchParams identity changes.
   */
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    if (hasProcessed.current) {
      console.log("[PropertyPaymentCallback] Already processed; skipping.");
      return;
    }

    const propertyId = searchParams.get("propertyId");
    const reference = searchParams.get("tx_ref");
    const transactionId = searchParams.get("transaction_id");
    const flwStatus = searchParams.get("status");

    console.log(
      "[PropertyPaymentCallback] Flutterwave redirect parameters",
      {
        propertyId,
        reference,
        transactionId,
        flwStatus,
        fullQueryString: window.location.search,
      },
    );

    if (flwStatus === "cancelled") {
      hasProcessed.current = true;
      setState("failed");
      setMessage("Payment was cancelled.");
      return;
    }

    if (!propertyId || !reference || !transactionId) {
      hasProcessed.current = true;
      setState("error");
      setMessage("Missing payment or property reference from the redirect.");
      return;
    }

    hasProcessed.current = true;

    console.log("[PropertyPaymentCallback] Starting verification", {
      propertyId,
      reference,
      transactionId,
      flwStatus,
    });

    const verifyAndSubmit = async () => {
      try {
        const verifyResponse = await apiFetch<VerifyResponse>(
          `/api/v1/payments/verify?reference=${encodeURIComponent(
            reference,
          )}&transactionId=${encodeURIComponent(transactionId)}`,
          getToken,
        );

        console.log("[PropertyPaymentCallback] Verification response", {
          success: verifyResponse.success,
          status: verifyResponse.data?.status,
        });

        if (verifyResponse.data.status !== "SUCCESS") {
          setState("failed");
          setMessage("The sale listing submission payment could not be confirmed.");
          return;
        }

        console.log("[PropertyPaymentCallback] About to submit property", {
          propertyId,
          paymentReference: reference,
        });

        const submitResponse = await apiFetch(
          `/api/v1/properties/${encodeURIComponent(propertyId)}/submit`,
          getToken,
          {
            method: "POST",
            body: JSON.stringify({
              paymentReference: reference,
            }),
          },
        );

        console.log("[PropertyPaymentCallback] Property submission response", {
          submitResponse,
        });

        setState("success");
      } catch (err) {
        setState("error");
        setMessage(
          err instanceof Error
            ? err.message
            : "Unable to complete the property submission.",
        );
      }
    };

    verifyAndSubmit();
  }, [isLoaded, isSignedIn, getToken, searchParams]);

  return (
    <>
      <TopAppBar title="Property Listing Payment" />

      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        {state === "loading" && (
          <p className="text-sm text-black/50">
            Confirming your payment and submitting the property...
          </p>
        )}

        {state === "success" && (
          <>
            <div className="rounded-full bg-status-success-bg p-4">
              <CheckCircle2 size={32} className="text-status-success-fg" />
            </div>

            <h2 className="text-lg font-semibold">
              Property Submitted
            </h2>

            <p className="max-w-xs text-sm text-black/50">
              Your sale listing submission payment was confirmed and the property has
              been submitted for verification.
            </p>
          </>
        )}

        {(state === "failed" || state === "error") && (
          <>
            <div className="rounded-full bg-status-danger-bg p-4">
              <XCircle size={32} className="text-status-danger-fg" />
            </div>

            <h2 className="text-lg font-semibold">
              Submission Not Completed
            </h2>

            <p className="max-w-xs text-sm text-black/50">
              {message ??
                "Your payment or property submission could not be completed."}
            </p>
          </>
        )}

        {state !== "loading" && (
          <Link href="/dashboard/owner" className="w-full max-w-sm">
            <Button>Back to Dashboard</Button>
          </Link>
        )}
      </div>
    </>
  );
}

export default function OwnerPaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <>
          <TopAppBar title="Property Listing Payment" />

          <p className="px-4 py-16 text-center text-sm text-black/40">
            Loading...
          </p>
        </>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
