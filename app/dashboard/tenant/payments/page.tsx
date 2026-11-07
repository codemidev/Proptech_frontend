"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PaginationControls from "@/components/PaginationControls";
import { TenantPill, tenantBtn, tenantCard } from "@/components/tenant/ui";

type LeaseResponse = {
  success: boolean;
  data: {
    status: string;
    rentAmount: string;
    startDate: string;
    endDate: string;
    property: { title: string; currency: string };
  } | null;
};

type PaymentSummary = {
  id: string;
  reference: string;
  amount: string;
  currency: string;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED";
  description: string | null;
  createdAt: string;
};

type PaymentsResponse = {
  success: boolean;
  data: PaymentSummary[];
};

const statusTone: Record<PaymentSummary["status"], "success" | "pending" | "danger"> = {
  PENDING: "pending",
  PROCESSING: "pending",
  SUCCESS: "success",
  FAILED: "danger",
  CANCELLED: "danger",
  REFUNDED: "pending",
};

const statusLabel: Record<PaymentSummary["status"], string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SUCCESS: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

function formatCurrency(amount: string, currency: string) {
  const value = Number(amount);
  const symbol = currency === "NGN" ? "₦" : currency;
  return `${symbol}${value.toLocaleString()}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PaymentsPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [lease, setLease] = useState<LeaseResponse["data"]>(null);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const load = async () => {
      try {
        const [leaseRes, paymentsRes] = await Promise.all([
          apiFetch<LeaseResponse>("/api/v1/leases/me", getToken),
          apiFetch<PaymentsResponse>("/api/v1/payments/me", getToken),
        ]);

        setLease(leaseRes.data);
        setPayments(paymentsRes.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load your payments",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLoaded, isSignedIn, getToken, router]);

  const handlePayNow = async () => {
    setPayError(null);
    setRedirecting(true);

    try {
      const res = await apiFetch<{
        success: boolean;
        data: { paymentLink: string; reference: string };
      }>("/api/v1/payments/rent/initialize", getToken, { method: "POST" });

      window.location.href = res.data.paymentLink;
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Unable to start payment",
      );
      setRedirecting(false);
    }
  };

  const isDraft = lease?.status === "DRAFT";

  const orderedPayments = [...payments].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const visiblePayments = orderedPayments.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main className="mx-auto max-w-lg px-4 pb-6 pt-6">
      <h1 className="text-[17px] font-medium text-[#111827]">Rent Payments</h1>

      {loading ? (
        <p className="mt-6 text-sm text-[#667085]">Loading...</p>
      ) : error ? (
        <p className="mt-6 text-sm text-status-danger-fg">{error}</p>
      ) : lease ? (
        <>
          <section className="mt-4 rounded-2xl bg-navy p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] text-white/60">
                  {isDraft ? "Activation Payment Due" : "Next Rent Payment"}
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {isDraft ? formatCurrency(lease.rentAmount, lease.property.currency) : "—"}
                </p>
              </div>
              <span className="rounded-full border border-[#FFE114] bg-[#FFE114]/15 px-3 py-1 text-[11px] text-[#FFE114]">
                {isDraft ? "Pending" : "Not due"}
              </span>
            </div>

            {lease.startDate && lease.endDate && (
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-[11px] text-white/60">Lease Term</p>
                  <p className="mt-0.5 text-sm font-medium">
                    {formatDate(lease.startDate)} — {formatDate(lease.endDate)}
                  </p>
                </div>
                <CalendarDays size={18} className="text-white/60" aria-hidden="true" />
              </div>
            )}
          </section>

          <h2 className="mt-6 text-sm font-medium text-[#111827]">Payment Status</h2>
          <div className={`${tenantCard} mt-3 p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{lease.property.title}</p>
                {isDraft && (
                  <p className="mt-1 text-[11px] leading-4 text-[#667085]">
                    Rent must be confirmed by the owner, the required contract fee must be satisfied, and you must accept the tenancy contract before activation.
                  </p>
                )}
              </div>
              <p className="shrink-0 text-sm font-semibold">
                {isDraft ? formatCurrency(lease.rentAmount, lease.property.currency) : "No installment due"}
              </p>
            </div>

            {payError && (
              <p className="mt-3 text-sm text-status-danger-fg">{payError}</p>
            )}

            {isDraft ? (
              <button
                type="button"
                onClick={handlePayNow}
                disabled={redirecting}
                className={tenantBtn("primary", "mt-4")}
              >
                {redirecting ? "Redirecting to secure checkout..." : "Pay Now"}
              </button>
            ) : (
              <p className="mt-4 text-sm text-[#667085]">
                No payment is due for this active lease yet. A future installment will appear here when scheduled.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className={`${tenantCard} mt-4 flex flex-col items-center gap-1 p-8 text-center`}>
          <p className="font-semibold">No Active Rentals</p>
          <p className="text-sm text-[#667085]">
            You do not have an active rental to pay rent for.
          </p>
        </div>
      )}

      <h2 className="mt-6 text-sm font-medium text-[#111827]">Recent Transactions</h2>

      {!loading && payments.length === 0 ? (
        <p className="mt-3 text-sm text-[#667085]">No payments yet.</p>
      ) : (
        <ul className="mt-1 divide-y divide-[#F5F6F7]">
          {visiblePayments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {payment.description ?? "Rent payment"}
                </p>
                <p className="mt-0.5 text-[11px] text-[#667085]">
                  {formatDate(payment.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <p className="text-sm font-semibold">
                  {formatCurrency(payment.amount, payment.currency)}
                </p>
                <TenantPill tone={statusTone[payment.status]}>
                  {statusLabel[payment.status]}
                </TenantPill>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && payments.length > 0 && (
        <PaginationControls page={page} totalItems={payments.length} pageSize={pageSize} onPageChange={setPage} />
      )}
    </main>
  );
}
