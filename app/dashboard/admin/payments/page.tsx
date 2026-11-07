"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

type Payment = {
  id: string;
  reference: string;
  payerId: string;
  purpose: string;
  method: string;
  status: string;
  currency: string;
  amount: string | number;
  total: string | number;
  description: string | null;
  createdAt: string;
  payer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
  };
  flutterwave: {
    txRef: string;
    flwRef: string | null;
    transactionId: string | null;
    chargedAmount: string | number | null;
    currency: string;
    paymentType: string | null;
    verified: boolean;
    gatewayStatus: string | null;
    verifiedAt: string | null;
  } | null;
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

function formatMoney(
  amount: string | number,
  currency: string,
) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return `${currency} ${amount}`;
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function purposeLabel(payment: Payment) {
  if (
    payment.purpose === "SERVICE_PAYMENT" &&
    payment.description?.startsWith(
      "Property sale listing submission fee:",
    )
  ) {
    return "Property Listing Submission";
  }

  if (payment.purpose === "RENT") {
    return "Rent Payment";
  }

  return payment.purpose.replaceAll("_", " ");
}

function statusClasses(status: string) {
  switch (status) {
    case "SUCCESS":
      return "bg-emerald-100 text-emerald-700";

    case "FAILED":
      return "bg-red-100 text-red-700";

    case "PENDING":
      return "bg-amber-100 text-amber-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function AdminPaymentsPage() {
  const { getToken } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] =
    useState<PaymentsResponse["data"]["pagination"] | null>(null);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [purpose, setPurpose] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });

      if (status) {
        params.set("status", status);
      }

      if (purpose) {
        params.set("purpose", purpose);
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await apiFetch<PaymentsResponse>(
        `/api/v1/admin/payments?${params.toString()}`,
        getToken,
      );

      setPayments(response.data.payments);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load payment history.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, page, status, purpose, search]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-gray-950">
      <header className="border-b border-white/10 bg-black text-white">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-6">
          <div>
            <div className="text-sm font-semibold tracking-tight">
              Aviritech{" "}
              <span className="text-yellow-400">PropTech</span>
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">
              Payment Transactions
            </div>
          </div>

          <a
            href="/dashboard/admin"
            className="rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold hover:bg-white/10"
          >
            Admin Dashboard
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-6">
        <div className="mb-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-600">
            Finance
          </p>

          <h1 className="text-3xl font-black tracking-tight">
            Payment Transactions
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Monitor payments made across Aviritech PropTech.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search reference or payer..."
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400"
          />

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>

          <select
            value={purpose}
            onChange={(event) => {
              setPurpose(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
          >
            <option value="">All payment types</option>
            <option value="SERVICE_PAYMENT">
              Service / Listing Payment
            </option>
            <option value="RENT">Rent</option>
          </select>

          <button
            onClick={loadPayments}
            className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500">
              Loading payments...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              No payments found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-gray-500">
                      Payer
                    </th>
                    <th className="px-5 py-4 font-semibold text-gray-500">
                      Transaction
                    </th>
                    <th className="px-5 py-4 font-semibold text-gray-500">
                      Amount
                    </th>
                    <th className="px-5 py-4 font-semibold text-gray-500">
                      Reference
                    </th>
                    <th className="px-5 py-4 font-semibold text-gray-500">
                      Flutterwave ID
                    </th>
                    <th className="px-5 py-4 font-semibold text-gray-500">
                      Status
                    </th>
                    <th className="px-5 py-4 font-semibold text-gray-500">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {payments.map((payment) => {
                    const payerName =
                      [
                        payment.payer.firstName,
                        payment.payer.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                      payment.payer.email;

                    return (
                      <tr
                        key={payment.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold">
                            {payerName}
                          </div>
                          <div className="mt-1 text-xs text-gray-400">
                            {payment.payer.email}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {purposeLabel(payment)}
                        </td>

                        <td className="px-5 py-4 font-bold">
                          {formatMoney(
                            payment.total,
                            payment.currency,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <code className="text-xs text-gray-600">
                            {payment.reference}
                          </code>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-xs text-gray-600">
                            {payment.flutterwave?.transactionId ||
                              "—"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                              payment.status,
                            )}`}
                          >
                            {payment.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-gray-500">
                          {formatDate(payment.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
              <p className="text-xs text-gray-500">
                Page {pagination.page} of{" "}
                {pagination.totalPages} · {pagination.total}{" "}
                transactions
              </p>

              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
