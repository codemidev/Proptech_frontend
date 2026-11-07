"use client";

import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { tenantBtn, tenantCard } from "@/components/tenant/ui";

type VerifyResponse = {
  success: boolean;
  data: { status: "SUCCESS" | "FAILED" };
};

type ReceiptPayment = {
  reference: string;
  amount: string;
  currency: string;
  description: string | null;
  createdAt: string;
};

type PaymentsMeResponse = {
  success: boolean;
  data: ReceiptPayment[];
};

type PropertyResponse = {
  success: boolean;
  data: {
    id: string;
    title: string;
    media: {
      url: string;
      thumbnailUrl: string | null;
    }[];
  };
};

type Inspection = {
  id: string;
  scheduledAt: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "MISSED";
  remarks: string | null;
  property: {
    id?: string;
    title: string;
    address: { addressLine1: string } | null;
  };
  inspector: {
    firstName: string | null;
    lastName: string | null;
  } | null;
  booking?: {
    id: string;
    reference: string;
    status: string;
    startDate: string;
    payment?: {
      id: string;
      reference: string;
      purpose: string;
      status: string;
      amount: string;
      currency: string;
    } | null;
  } | null;
};

type InspectionsMeResponse = {
  success: boolean;
  data: Inspection[];
};

function formatCurrency(amount: string, currency: string) {
  const value = Number(amount);
  const symbol = currency === "NGN" ? "₦" : currency;
  return `${symbol}${value.toLocaleString()}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveMediaUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return url;
}

function inspectionStatusLabel(status: Inspection["status"]) {
  switch (status) {
    case "CONFIRMED":
      return "Inspection Confirmed";
    case "COMPLETED":
      return "Inspection Completed";
    case "CANCELLED":
      return "Inspection Cancelled";
    case "MISSED":
      return "Inspection Missed";
    default:
      return "Inspection Pending";
  }
}

function CallbackContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const searchParams = useSearchParams();

  const [state, setState] = useState<"loading" | "success" | "failed" | "error">(
    "loading",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptPayment | null>(null);
  const [property, setProperty] = useState<PropertyResponse["data"] | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);

  const txRef = searchParams.get("tx_ref");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const reference = searchParams.get("tx_ref");
    const transactionId = searchParams.get("transaction_id");
    const flwStatus = searchParams.get("status");

    if (flwStatus === "cancelled") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("failed");
      setMessage("Payment was cancelled.");
      return;
    }

    if (!reference || !transactionId) {
      setState("error");
      setMessage("Missing payment reference from the redirect.");
      return;
    }

    const verify = async () => {
      try {
        const res = await apiFetch<VerifyResponse>(
          `/api/v1/payments/verify?reference=${encodeURIComponent(reference)}&transactionId=${encodeURIComponent(transactionId)}`,
          getToken,
        );

        setState(res.data.status === "SUCCESS" ? "success" : "failed");

        if (res.data.status === "SUCCESS") {
          const propertyId = searchParams.get("propertyId");

          try {
            const list = await apiFetch<PaymentsMeResponse>(
              "/api/v1/payments/me",
              getToken,
            );
            setReceipt(list.data.find((p) => p.reference === reference) ?? null);
          } catch {
            setReceipt(null);
          }

          if (propertyId) {
            try {
              const propertyResponse = await apiFetch<PropertyResponse>(
                `/api/v1/properties/${encodeURIComponent(propertyId)}`,
                getToken,
              );
              setProperty(propertyResponse.data);
            } catch {
              setProperty(null);
            }
          }

          try {
            const inspectionsResponse = await apiFetch<InspectionsMeResponse>(
              "/api/v1/inspections/me",
              getToken,
            );

            const matchedInspection = inspectionsResponse.data.find(
              (item) =>
                item.booking?.payment?.reference === reference ||
                item.booking?.reference === reference,
            );

            setInspection(matchedInspection ?? null);
          } catch {
            setInspection(null);
          }
        }
      } catch (err) {
        setState("error");
        setMessage(
          err instanceof Error ? err.message : "Unable to verify your payment",
        );
      }
    };

    verify();
  }, [isLoaded, isSignedIn, getToken, searchParams]);

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center px-4 pb-8 pt-14 text-center">
      {state === "loading" && (
        <p className="mt-24 text-sm text-[#667085]">Confirming your payment...</p>
      )}

      {state === "success" && (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E4F6EC]">
            <Check size={30} className="text-[#277A59]" aria-hidden="true" />
          </div>

          <h1 className="mt-5 text-2xl font-medium text-[#111827]">
            Payment Successful!
          </h1>

          {receipt && (
            <p className="mt-1 text-xl font-semibold text-[#111827]">
              {formatCurrency(receipt.amount, receipt.currency)}
            </p>
          )}

          <dl className={`${tenantCard} mt-6 w-full space-y-3 p-4 text-left text-sm`}>
            {receipt && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[11px] text-[#667085]">Date</dt>
                <dd className="font-medium">{formatDateTime(receipt.createdAt)}</dd>
              </div>
            )}
            {(receipt?.reference ?? txRef) && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[11px] text-[#667085]">Reference</dt>
                <dd className="break-all font-medium">{receipt?.reference ?? txRef}</dd>
              </div>
            )}
            {receipt?.description && (
              <div>
                <dt className="text-[11px] text-[#667085]">Property</dt>
                <dd className="mt-0.5 font-medium">{receipt.description}</dd>
              </div>
            )}
            {!receipt && (
              <p className="text-xs text-[#667085]">
                Your rent payment has been received.
              </p>
            )}
          </dl>

          {property && (
            <div className={`${tenantCard} mt-4 w-full overflow-hidden text-left`}>
              {property.media[0] && (
                <img
                  src={resolveMediaUrl(
                    property.media[0].thumbnailUrl ?? property.media[0].url,
                  )}
                  alt={property.title}
                  className="h-48 w-full object-cover"
                />
              )}

              <div className="p-4">
                <p className="text-[11px] text-[#667085]">Property</p>
                <h2 className="mt-1 text-base font-semibold text-[#111827]">
                  {property.title}
                </h2>

                {inspection && (
                  <div className="mt-4 rounded-xl bg-[#F8F9FA] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-[#667085]">
                        Inspection status
                      </span>
                      <span className="rounded-full bg-[#E4F6EC] px-2.5 py-1 text-[11px] font-medium text-[#277A59]">
                        {inspectionStatusLabel(inspection.status)}
                      </span>
                    </div>

                    <div className="mt-3">
                      <p className="text-[11px] text-[#667085]">
                        Scheduled for
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-[#111827]">
                        {formatDateTime(inspection.scheduledAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={`${tenantCard} mt-4 w-full p-4 text-left`}>
            <p className="text-sm font-semibold text-[#111827]">
              Payment Details
            </p>

            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[11px] text-[#667085]">Status</dt>
                <dd className="font-medium text-[#277A59]">Successful</dd>
              </div>

              {receipt && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[11px] text-[#667085]">Amount</dt>
                  <dd className="font-medium">
                    {formatCurrency(receipt.amount, receipt.currency)}
                  </dd>
                </div>
              )}

              {receipt && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[11px] text-[#667085]">Date</dt>
                  <dd className="font-medium">
                    {formatDateTime(receipt.createdAt)}
                  </dd>
                </div>
              )}

              {(receipt?.reference ?? txRef) && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[11px] text-[#667085]">Reference</dt>
                  <dd className="break-all text-right font-medium">
                    {receipt?.reference ?? txRef}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="mt-6 flex w-full flex-col gap-3">
            {inspection && (
              <Link
                href="/dashboard/tenant/inspections"
                className={tenantBtn("primary")}
              >
                View Inspection
              </Link>
            )}
            <Link href="/dashboard/tenant" className={tenantBtn("outline")}>
              Back to Dashboard
            </Link>
          </div>
        </>
      )}

      {(state === "failed" || state === "error") && (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FDE8E8]">
            <X size={30} className="text-[#B42318]" aria-hidden="true" />
          </div>

          <h1 className="mt-5 text-2xl font-medium text-[#111827]">Payment Failed</h1>
          <p className="mt-2 max-w-xs text-sm text-[#667085]">
            {message ?? "Your payment could not be processed."}
          </p>

          <div className="mt-8 flex w-full flex-col gap-3">
            <Link href="/dashboard/tenant/payments" className={tenantBtn("primary")}>
              Back to Payments
            </Link>
            <Link href="/dashboard/tenant" className={tenantBtn("outline")}>
              Back to Dashboard
            </Link>
          </div>
        </>
      )}
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-16 text-center text-sm text-[#667085]">
          Loading...
        </p>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
