"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/src/lib/api";

type Payment = {
  id: string;
  reference: string;
  purpose: string;
  status: string;
  currency: string;
  amount: string | number;
  total: string | number;
  description: string | null;
  createdAt: string;
};

type PaymentsResponse = {
  success: boolean;
  data: Payment[];
};

type Property = {
  id: string;
  status?: string;
  published?: boolean;
};

type PropertiesResponse = {
  success: boolean;
  data: Property[] | {
    properties?: Property[];
  };
};

function amount(payment: Payment) {
  const value = Number(payment.total ?? payment.amount);
  return Number.isFinite(value) ? value : 0;
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency || "NGN"} ${value.toLocaleString()}`;
  }
}

export default function OwnerAnalyticsPage() {
  const { getToken } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const token = await getToken();


      const [paymentsResponse, propertiesResponse] = await Promise.all([
          apiFetch("/api/v1/payments/me", token),
          apiFetch("/api/v1/properties", token),
        ]);

        if (cancelled) return;

        setPayments(
          Array.isArray(paymentsResponse.data)
            ? paymentsResponse.data
            : [],
        );

        const propertyData = propertiesResponse.data;

        if (Array.isArray(propertyData)) {
          setProperties(propertyData);
        } else {
          setProperties(propertyData?.properties ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load analytics.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const successfulPayments = useMemo(
    () => payments.filter((payment) => payment.status === "SUCCESS"),
    [payments],
  );

  const pendingPayments = useMemo(
    () =>
      payments.filter((payment) =>
        ["PENDING", "PROCESSING"].includes(payment.status),
      ),
    [payments],
  );

  const failedPayments = useMemo(
    () =>
      payments.filter((payment) =>
        ["FAILED", "CANCELLED"].includes(payment.status),
      ),
    [payments],
  );

  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const payment of successfulPayments) {
      const currency = payment.currency || "NGN";
      totals[currency] = (totals[currency] || 0) + amount(payment);
    }

    return Object.entries(totals);
  }, [successfulPayments]);

  const activeProperties = properties.filter((property) =>
    ["ACTIVE", "AVAILABLE"].includes(property.status || ""),
  ).length;

  const occupiedProperties = properties.filter((property) =>
    ["RENTED", "LEASED", "OCCUPIED"].includes(property.status || ""),
  ).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] p-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="h-10 w-56 animate-pulse rounded-xl bg-white" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl bg-white"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-600">
              Owner Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Overview of your properties and payment activity.
            </p>
          </div>

          <a
            href="/dashboard/owner"
            className="w-fit rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            Back to Dashboard
          </a>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Total Properties"
            value={properties.length.toLocaleString()}
          />
          <Metric
            label="Active Listings"
            value={activeProperties.toLocaleString()}
          />
          <Metric
            label="Occupied"
            value={occupiedProperties.toLocaleString()}
          />
          <Metric
            label="Successful Payments"
            value={successfulPayments.length.toLocaleString()}
          />
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-5">
              <h2 className="text-sm font-bold text-slate-950">
                Payment Performance
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Successfully completed payments from your account.
              </p>
            </div>

            {totalsByCurrency.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No successful payments yet.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {totalsByCurrency.map(([currency, total]) => (
                  <div
                    key={currency}
                    className="rounded-xl bg-slate-50 p-4"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Total {currency}
                    </p>
                    <p className="mt-2 text-xl font-bold text-slate-950">
                      {formatMoney(total, currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-sm font-bold text-slate-950">
              Payment Status
            </h2>

            <div className="mt-5 space-y-3">
              <StatRow
                label="Successful"
                value={successfulPayments.length}
              />
              <StatRow
                label="Pending / Processing"
                value={pendingPayments.length}
              />
              <StatRow
                label="Failed / Cancelled"
                value={failedPayments.length}
              />
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-sm font-bold text-slate-950">
              Recent Transactions
            </h2>
          </div>

          {payments.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">
              No transactions found.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {payments
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )
                .slice(0, 10)
                .map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {payment.purpose.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {payment.reference}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-slate-900">
                        {formatMoney(
                          amount(payment),
                          payment.currency,
                        )}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className="text-sm font-bold text-slate-950">{value}</span>
    </div>
  );
}
