"use client";

import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock3, RefreshCw, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { Card } from "@/components/ui/Card";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type Purchase = {
  id: string;
  billerName: string;
  itemName: string;
  customerId: string;
  amount: string | number;
  currency: string;
  status: string;
  providerMessage: string | null;
  providerToken: string | null;
  payment: {
    reference: string;
    status: string;
  };
};

type ViewState = "loading" | "paid" | "failed" | "error";

function formatMoney(value: string | number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function deliveryLabel(status?: string) {
  switch (status) {
    case "SUCCESS": return "Utility delivered";
    case "FAILED": return "Provider delivery failed";
    case "PROCESSING": return "Provider processing";
    case "AWAITING_FUNDING": return "Awaiting provider funding";
    case "UNKNOWN": return "Delivery confirmation pending";
    default: return "Awaiting provider confirmation";
  }
}

function CallbackContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const params = useSearchParams();

  const reference = params.get("tx_ref") ?? "";
  const transactionId = params.get("transaction_id") ?? "";
  const gatewayStatus = params.get("status") ?? "";

  const [state, setState] = useState<ViewState>("loading");
  const [message, setMessage] = useState("");
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadPurchase(paymentReference: string) {
    const response = await apiFetch<ApiResponse<Purchase[]>>(
      "/api/v1/payments/bills/purchases",
      getToken,
    );

    const found = (response.data ?? []).find(
      (entry) => entry.payment.reference === paymentReference,
    );

    setPurchase(found ?? null);
  }

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    async function verify() {
      if (gatewayStatus.toLowerCase() === "cancelled") {
        setState("failed");
        setMessage("You cancelled the checkout. No successful payment was recorded.");
        return;
      }

      if (!reference || !transactionId) {
        setState("error");
        setMessage("The payment callback is missing its transaction reference.");
        return;
      }

      try {
        const response = await apiFetch<
          ApiResponse<{ status: "SUCCESS" | "FAILED" }>
        >(
          `/api/v1/payments/verify?reference=${encodeURIComponent(reference)}&transactionId=${encodeURIComponent(transactionId)}`,
          getToken,
        );

        if (cancelled) return;

        if (response.data.status !== "SUCCESS") {
          setState("failed");
          setMessage("Flutterwave has not confirmed this payment as successful.");
          return;
        }

        setState("paid");
        setMessage("Your checkout payment has been verified.");

        try {
          await loadPurchase(reference);
        } catch {
          // The payment remains verified. Purchase history can be checked separately.
        }
      } catch (error) {
        if (cancelled) return;
        setState("error");
        setMessage(
          error instanceof Error ? error.message : "Unable to verify this payment.",
        );
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, reference, transactionId, gatewayStatus]);

  async function refreshDelivery() {
    if (!purchase) return;

    setRefreshing(true);
    try {
      await apiFetch<ApiResponse<Purchase>>(
        `/api/v1/payments/bills/purchases/${encodeURIComponent(purchase.id)}/status`,
        getToken,
      );
      await loadPurchase(reference);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to refresh provider delivery status.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <TopAppBar title="Utility Payment" />
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-12 text-center">
        {state === "loading" && (
          <div className="py-16 text-sm text-slate-600">
            Verifying your Flutterwave payment...
          </div>
        )}

        {state === "paid" && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-700" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">
              Payment verified
            </h1>
            <p className="mt-2 text-sm text-slate-600">{message}</p>

            <Card>
              <div className="mt-6 w-full space-y-4 p-5 text-left text-sm">
                {purchase ? (
                  <>
                    <div>
                      <p className="text-xs text-slate-500">Provider</p>
                      <p className="font-semibold text-slate-900">
                        {purchase.billerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Utility</p>
                      <p className="font-medium text-slate-900">{purchase.itemName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Meter / account</p>
                      <p className="break-all font-medium text-slate-900">
                        {purchase.customerId}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Utility amount</p>
                      <p className="font-semibold text-slate-900">
                        {formatMoney(purchase.amount, purchase.currency)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="font-semibold text-amber-900">
                        {deliveryLabel(purchase.status)}
                      </p>
                      {purchase.providerMessage && (
                        <p className="mt-1 text-xs text-amber-800">
                          {purchase.providerMessage}
                        </p>
                      )}
                    </div>

                    {purchase.providerToken && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs font-semibold text-emerald-800">
                          Provider token / code
                        </p>
                        <p className="mt-1 break-all font-mono text-lg font-bold text-emerald-950">
                          {purchase.providerToken}
                        </p>
                      </div>
                    )}

                    {!["SUCCESS", "FAILED"].includes(purchase.status) && (
                      <button
                        type="button"
                        disabled={refreshing}
                        onClick={refreshDelivery}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 disabled:opacity-50"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        {refreshing ? "Checking delivery..." : "Check delivery status"}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-600">
                    Your payment is verified. The purchase record is not currently
                    available; check your utility purchase history.
                  </p>
                )}

                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-500">Payment reference</p>
                  <p className="break-all font-medium text-slate-800">{reference}</p>
                </div>
              </div>
            </Card>

            <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Clock3 className="h-4 w-4" />
              Checkout confirmation and utility delivery are separate stages.
            </p>
          </>
        )}

        {(state === "failed" || state === "error") && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-700" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-slate-900">
              {state === "failed" ? "Payment not completed" : "Unable to verify payment"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
            {reference && (
              <p className="mt-3 break-all text-xs text-slate-500">
                Reference: {reference}
              </p>
            )}
          </>
        )}

        {state !== "loading" && (
          <Link
            href="/dashboard/tenant/utilities"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
          >
            Return to Utilities
          </Link>
        )}
      </main>
    </>
  );
}

export default function UtilityPaymentCallbackPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-sm text-slate-600">Loading payment status...</main>}>
      <CallbackContent />
    </Suspense>
  );
}
