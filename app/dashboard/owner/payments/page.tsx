"use client";

import { useEffect, useMemo, useState } from "react";
import PaginationControls from "@/components/PaginationControls";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

type FlutterwaveTransaction = {
  txRef: string;
  flwRef: string | null;
  transactionId: string | null;
  chargedAmount: string | number | null;
  currency: string;
  paymentType: string | null;
  verified: boolean;
  gatewayStatus: string | null;
  verifiedAt: string | null;
};

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
  updatedAt: string;
  flutterwave: FlutterwaveTransaction | null;
};

type PaymentsResponse = {
  success: boolean;
  data: Payment[];
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

function purposeLabel(purpose: string, description: string | null) {
  if (
    purpose === "SERVICE_PAYMENT" &&
    description?.startsWith("Property sale listing submission fee:")
  ) {
    return "Property Listing Submission";
  }

  if (purpose === "RENT") {
    return "Rent Payment";
  }

  return purpose.replaceAll("_", " ");
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

export default function OwnerPaymentsPage() {
  const { getToken } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function loadPayments() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch<PaymentsResponse>(
        "/api/v1/payments/me",
        getToken,
      );

      setPayments(response.data);
      setPage(1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load transaction history.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Loads the initial payment history from the API.
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Initial load only; getToken is supplied by the auth hook.
  }, []);

  const orderedPayments = useMemo(
    () => [...payments].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [payments],
  );
  const visiblePayments = orderedPayments.slice((page - 1) * pageSize, page * pageSize);

  const successfulTotal = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "SUCCESS")
        .reduce((sum, payment) => sum + Number(payment.total), 0),
    [payments],
  );

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-gray-950">
      <header className="border-b border-white/10 bg-black text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <div className="text-lg font-black tracking-tight">
              Aviritech <span className="text-yellow-400">PropTech</span>
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">
              Transaction History
            </div>
          </div>

          <a
            href="/dashboard/owner"
            className="rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold hover:bg-white/10"
          >
            Back to Dashboard
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-yellow-600">
            Payments
          </p>

          <h1 className="text-3xl font-black tracking-tight">
            Transaction History
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            View your rent payments, property listing fees, and other
            PropTech transactions.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Transactions
            </p>
            <p className="mt-2 text-2xl font-black">
              {payments.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Successful Payments
            </p>
            <p className="mt-2 text-2xl font-black">
              ₦{successfulTotal.toLocaleString("en-NG")}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500">
              Loading transaction history...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold">No transactions yet.</p>
              <p className="mt-1 text-sm text-gray-500">
                Your payments will appear here after a transaction is
                initiated.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
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
                      Status
                    </th>
                    <th className="px-5 py-4 font-semibold text-gray-500">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {visiblePayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-semibold">
                          {purposeLabel(
                            payment.purpose,
                            payment.description,
                          )}
                        </div>

                        {payment.flutterwave?.transactionId && (
                          <div className="mt-1 text-xs text-gray-400">
                            Flutterwave ID:{" "}
                            {payment.flutterwave.transactionId}
                          </div>
                        )}
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
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClasses(
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
                  ))}
                </tbody>
              </table>
              <PaginationControls page={page} totalItems={orderedPayments.length} pageSize={pageSize} onPageChange={setPage} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
