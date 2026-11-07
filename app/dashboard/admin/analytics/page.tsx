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
  total: string | number;
  description: string | null;
  createdAt: string;
  payer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
};

type PaymentsResponse = {
  success: boolean;
  data: {
    payments: Payment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

type DashboardStats = Record<string, unknown>;

type DashboardStatsResponse = {
  success: boolean;
  data: DashboardStats;
};

function amount(payment: Payment) {
  const value = Number(payment.total);
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

export default function AdminAnalyticsPage() {
  const { getToken } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [dashboardStats, setDashboardStats] =
    useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const token = await getToken();

      const [paymentsResponse, statsResponse] = await Promise.all([
          apiFetch(
            "/api/v1/admin/payments?page=1&limit=100",
            token,
          ),
          apiFetch(
            "/api/v1/admin/dashboard/stats",
            token,
          ),
        ]);

        if (cancelled) return;

        setPayments(paymentsResponse.data?.payments ?? []);
        setPaymentTotal(
          paymentsResponse.data?.pagination?.total ?? 0,
        );
        setDashboardStats(statsResponse.data ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load admin analytics.",
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

  const successful = useMemo(
    () => payments.filter((payment) => payment.status === "SUCCESS"),
    [payments],
  );

  const pending = useMemo(
    () =>
      payments.filter((payment) =>
        ["PENDING", "PROCESSING"].includes(payment.status),
      ),
    [payments],
  );

  const failed = useMemo(
    () =>
      payments.filter((payment) =>
        ["FAILED", "CANCELLED"].includes(payment.status),
      ),
    [payments],
  );

  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const payment of successful) {
      const currency = payment.currency || "NGN";
      totals[currency] = (totals[currency] || 0) + amount(payment);
    }

    return Object.entries(totals);
  }, [successful]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] p-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="h-10 w-64 animate-pulse rounded-xl bg-white" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
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
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-6 sm:px-6 lg:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-600">
              Administration
            </p>
            <h1 className="mt-1 text-lg font-semibold text-slate-950">
              Platform Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Platform-wide payment and operational performance.
            </p>
          </div>

          <a
            href="/dashboard/admin"
            className="w-fit rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
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
            label="Payment Transactions"
            value={paymentTotal.toLocaleString()}
          />
          <Metric
            label="Successful"
            value={successful.length.toLocaleString()}
          />
          <Metric
            label="Pending"
            value={pending.length.toLocaleString()}
          />
          <Metric
            label="Failed"
            value={failed.length.toLocaleString()}
          />
        </div>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-slate-950">
              Total Amount Made
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Successful payments only. Amounts are separated by currency.
            </p>
          </div>

          {totalsByCurrency.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No successful payments recorded.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {totalsByCurrency.map(([currency, total]) => (
                <div
                  key={currency}
                  className="rounded-xl bg-slate-950 p-5 text-white"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-yellow-400">
                    {currency}
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatMoney(total, currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-sm font-semibold text-slate-950">
              Payment Status
            </h2>

            <div className="mt-5 space-y-3">
              <StatRow label="Successful" value={successful.length} />
              <StatRow
                label="Pending / Processing"
                value={pending.length}
              />
              <StatRow
                label="Failed / Cancelled"
                value={failed.length}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-sm font-semibold text-slate-950">
              Platform Statistics
            </h2>

            {dashboardStats &&
            Object.entries(dashboardStats).length > 0 ? (
              <div className="mt-5 space-y-3">
                {Object.entries(dashboardStats)
                  .filter(
                    ([, value]) =>
                      typeof value === "string" ||
                      typeof value === "number",
                  )
                  .slice(0, 6)
                  .map(([key, value]) => (
                    <StatRow
                      key={key}
                      label={key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (char) => char.toUpperCase())}
                      value={String(value)}
                    />
                  ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-400">
                Platform statistics are unavailable.
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Recent Transactions
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Latest payment activity across the platform.
              </p>
            </div>

            <a
              href="/dashboard/admin/payments"
              className="text-xs font-semibold text-slate-700 hover:text-yellow-600"
            >
              View All Payments
            </a>
          </div>

          {payments.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">
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
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {payment.payer.firstName ||
                        payment.payer.lastName
                          ? `${payment.payer.firstName ?? ""} ${
                              payment.payer.lastName ?? ""
                            }`.trim()
                          : payment.payer.email}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        {payment.purpose.replace(/_/g, " ")} ·{" "}
                        {payment.reference}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold text-slate-900">
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
      <p className="mt-3 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-950">{value}</span>
    </div>
  );
}
