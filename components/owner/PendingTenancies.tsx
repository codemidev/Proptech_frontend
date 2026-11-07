"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { GetToken } from "@/lib/api";
import { apiFetch } from "@/lib/api";

type CompletedInspection = {
  id: string;
  scheduledAt: string;
  property: { id: string; title: string };
  booking: {
    customer: { firstName: string | null; lastName: string | null; email: string };
  };
};

type CompletedInspectionsResponse = { success: boolean; data: CompletedInspection[] };

const RENT_FREQUENCIES = [
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUALLY",
  "ANNUALLY",
  "WEEKLY",
  "DAILY",
];

export function PendingTenancies({ getToken }: { getToken: GetToken }) {
  const [inspections, setInspections] = useState<CompletedInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentFrequency, setRentFrequency] = useState("ANNUALLY");
  const [rentAmount, setRentAmount] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");

  async function load() {
    try {
      setError("");
      const res = await apiFetch<CompletedInspectionsResponse>(
        "/api/v1/inspections/completed",
        getToken,
      );
      setInspections(res.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load completed inspections",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCreating(id: string) {
    setOpenId(id);
    setStartDate("");
    setEndDate("");
    setRentFrequency("ANNUALLY");
    setRentAmount("");
    setSecurityDeposit("");
  }

  async function handleCreateLease(event: FormEvent, inspectionId: string) {
    event.preventDefault();

    if (!startDate || !endDate || !rentAmount) {
      setError("Start date, end date, and rent amount are required.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const checkout = await apiFetch<{
        success: boolean;
        data: {
          paid: boolean;
          paymentLink?: string;
          amount?: number;
          currency?: string;
        };
      }>("/api/v1/payments/contract-generation/initialize", getToken, {
        method: "POST",
        body: JSON.stringify({ inspectionId }),
      });

      if (!checkout.data.paid) {
        if (!checkout.data.paymentLink) {
          throw new Error("Checkout link was not returned. Please try again.");
        }
        window.location.assign(checkout.data.paymentLink);
        return;
      }

      await apiFetch("/api/v1/leases", getToken, {
        method: "POST",
        body: JSON.stringify({
          inspectionId,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          rentFrequency,
          rentAmount: Number(rentAmount),
          ...(securityDeposit ? { securityDeposit: Number(securityDeposit) } : {}),
        }),
      });

      setOpenId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create tenancy.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return null;
  if (inspections.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-gray-900">Pending Tenancies</h2>
      <p className="text-sm text-gray-500 mt-1">
        Completed inspections awaiting a tenancy agreement.
      </p>

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-4">
        {inspections.map((inspection) => (
          <article
            key={inspection.id}
            className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {inspection.property.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Tenant: {inspection.booking.customer.firstName}{" "}
                  {inspection.booking.customer.lastName} (
                  {inspection.booking.customer.email})
                </p>
              </div>

              {openId !== inspection.id && (
                <button
                  type="button"
                  onClick={() => startCreating(inspection.id)}
                  className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
                >
                  Create Tenancy
                </button>
              )}
            </div>

            {openId === inspection.id && (
              <form
                onSubmit={(event) => handleCreateLease(event, inspection.id)}
                className="mt-4 grid grid-cols-2 gap-3"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Rent Frequency
                  </label>
                  <select
                    value={rentFrequency}
                    onChange={(e) => setRentFrequency(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {RENT_FREQUENCIES.map((freq) => (
                      <option key={freq} value={freq}>
                        {freq}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Rent Amount (NGN)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Security Deposit (NGN, optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenId(null)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Confirm Tenancy"}
                  </button>
                </div>
              </form>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
