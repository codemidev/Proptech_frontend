"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Payout = {
  id: string;
  reference: string;
  amount: string | number;
  currency: string;
  status: string;
  transferId?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  beneficiary: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
  items: Array<{
    id: string;
    sourceType: string;
    amount: string | number;
    currency: string;
  }>;
};

type Batch = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  createdAt: string;
  payouts: Payout[];
};

type ApiResponse<T> = { success: boolean; data: T; message?: string };

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function date(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function AdminPayoutsPage() {
  const { getToken } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<ApiResponse<Batch[]>>(
        "/api/v1/admin/payouts",
        getToken,
      );
      setBatches(response.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payout batches.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  async function runAction(key: string, path: string, method: string, body?: unknown) {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await apiFetch(path, getToken, {
        method,
        ...(body ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        } : {}),
      });
      setNotice("Payout operation completed.");
      await loadBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payout operation failed.");
    } finally {
      setBusy("");
    }
  }

  async function createBatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!periodStart || !periodEnd || periodStart > periodEnd) {
      setError("Choose a valid start date and end date.");
      return;
    }
    await runAction("create", "/api/v1/admin/payouts/batches", "POST", {
      periodStart,
      periodEnd,
    });
  }

  async function reconcile(payout: Payout) {
    const transferReference = window.prompt(
      `Enter the verified bank/Flutterwave transfer reference for ${payout.reference}:`,
    )?.trim();
    if (!transferReference) return;

    const confirmed = window.confirm(
      `Confirm that ${money(payout.amount, payout.currency)} was independently verified as transferred to ${payout.beneficiary.firstName ?? ""} ${payout.beneficiary.lastName ?? ""}?\n\nOnly confirm after checking the bank or Flutterwave record.`,
    );
    if (!confirmed) return;

    await runAction(
      payout.id,
      `/api/v1/admin/payouts/payouts/${payout.id}/reconcile`,
      "POST",
      { transferReference, transferConfirmed: true },
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/dashboard/admin" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
              ← Admin dashboard
            </Link>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
              Finance operations
            </p>
            <h1 className="mt-1 text-3xl font-black">Weekly Agent Payouts</h1>
            <p className="mt-2 text-sm text-slate-500">
              Review eligible earnings, prepare payout batches and reconcile verified transfers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadBatches()}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {notice}
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Create weekly payout batch</h2>
          <p className="mt-1 text-sm text-slate-500">
            Only existing eligible, unsettled agent commissions and settled-source referral rewards are included.
          </p>
          <form onSubmit={createBatch} className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm font-semibold">
              Period start
              <input
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                required
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              Period end
              <input
                type="date"
                value={periodEnd}
                min={periodStart || undefined}
                onChange={(event) => setPeriodEnd(event.target.value)}
                required
                className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
              />
            </label>
            <button
              type="submit"
              disabled={!!busy || !periodStart || !periodEnd}
              className="rounded-xl bg-[#FACC15] px-5 py-3 text-sm font-bold text-slate-950 hover:bg-yellow-400 disabled:opacity-50"
            >
              {busy === "create" ? "Creating..." : "Create batch"}
            </button>
          </form>
        </section>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Payout batches</h2>
          <span className="text-sm text-slate-500">{batches.length} batches</span>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            Loading payout batches...
          </div>
        ) : batches.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <h3 className="font-bold">No payout batches yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Create a batch for a completed payout period to review eligible earnings.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {batches.map((batch) => (
              <section key={batch.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                  <div>
                    <h3 className="font-bold">
                      {date(batch.periodStart)} – {date(batch.periodEnd)}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Batch {batch.id} · {batch.payouts.length} beneficiary payouts
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                      {batch.status}
                    </span>
                    {batch.status === "DRAFT" && (
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => void runAction(batch.id, `/api/v1/admin/payouts/batches/${batch.id}/review`, "POST")}
                        className="rounded-lg bg-[#FACC15] px-3 py-2 text-xs font-bold disabled:opacity-50"
                      >
                        {busy === batch.id ? "Working..." : "Review batch"}
                      </button>
                    )}
                    {batch.status === "REVIEWED" && (
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => {
                          if (window.confirm("Move all payouts in this reviewed batch to PROCESSING? This does not transfer funds.")) {
                            void runAction(batch.id, `/api/v1/admin/payouts/batches/${batch.id}/processing`, "POST");
                          }
                        }}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {busy === batch.id ? "Working..." : "Mark processing"}
                      </button>
                    )}
                  </div>
                </div>

                {batch.payouts.length === 0 ? (
                  <p className="p-5 text-sm text-slate-500">No payout records in this batch.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {batch.payouts.map((payout) => {
                      const beneficiaryName =
                        `${payout.beneficiary.firstName ?? ""} ${payout.beneficiary.lastName ?? ""}`.trim() ||
                        payout.beneficiary.email;
                      return (
                        <div key={payout.id} className="p-5">
                          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                            <div className="min-w-0">
                              <p className="font-bold">{beneficiaryName}</p>
                              <p className="mt-1 text-xs text-slate-500">{payout.beneficiary.email}</p>
                              <p className="mt-2 text-xs text-slate-500">
                                {payout.bankName ?? "Bank unavailable"} · {payout.accountName ?? "Account name unavailable"} · {payout.accountNumber ?? "****"}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {payout.reference} · {payout.items.length} earning item(s)
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="text-left lg:text-right">
                                <p className="text-lg font-black">{money(payout.amount, payout.currency)}</p>
                                <p className="text-xs font-semibold text-slate-500">{payout.status}</p>
                              </div>
                              {payout.status === "PROCESSING" && batch.status === "PROCESSING" && (
                                <button
                                  type="button"
                                  disabled={!!busy}
                                  onClick={() => void reconcile(payout)}
                                  className="rounded-lg bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                                >
                                  {busy === payout.id ? "Reconciling..." : "Record verified transfer"}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {payout.items.map((item) => (
                              <span key={item.id} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                                {item.sourceType.replaceAll("_", " ")} · {money(item.amount, item.currency)}
                              </span>
                            ))}
                          </div>
                          {payout.transferId && (
                            <p className="mt-2 text-xs text-emerald-700">
                              Transfer reference: {payout.transferId}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
          Processing only records that a batch is ready for payment. It does not initiate a transfer. Mark a payout successful only after independently verifying the transfer in the bank or Flutterwave account.
        </p>
      </div>
    </main>
  );
}
