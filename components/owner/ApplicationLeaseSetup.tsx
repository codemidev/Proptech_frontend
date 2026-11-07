"use client";

import { useState, type FormEvent } from "react";
import type { GetToken } from "@/lib/api";
import { apiFetch } from "@/lib/api";

const FREQUENCIES = [
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUALLY",
  "ANNUALLY",
  "WEEKLY",
  "DAILY",
];

export function ApplicationLeaseSetup({
  inspectionId,
  getToken,
}: {
  inspectionId: string;
  getToken: GetToken;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentFrequency, setRentFrequency] = useState("ANNUALLY");
  const [rentAmount, setRentAmount] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!startDate || !endDate || !rentAmount) {
      setError("Start date, end date, and rent amount are required.");
      return;
    }
    if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
      setError("The end date must be after the start date.");
      return;
    }
    if (!Number.isFinite(Number(rentAmount)) || Number(rentAmount) <= 0) {
      setError("Enter a valid rent amount.");
      return;
    }
    if (securityDeposit && (!Number.isFinite(Number(securityDeposit)) || Number(securityDeposit) < 0)) {
      setError("Enter a valid security deposit.");
      return;
    }

    setCreating(true);
    try {
      const draft = {
        inspectionId,
        startDate,
        endDate,
        rentFrequency,
        rentAmount: Number(rentAmount),
        ...(securityDeposit !== "" ? { securityDeposit: Number(securityDeposit) } : {}),
      };

      // Persist the validated terms before leaving the app for checkout.
      sessionStorage.setItem(
        `aviritech:lease-setup:${inspectionId}`,
        JSON.stringify(draft),
      );

      const checkout = await apiFetch<{
        success: boolean;
        data: { paid: boolean; paymentLink?: string };
        message?: string;
      }>("/api/v1/payments/contract-generation/initialize", getToken, {
        method: "POST",
        body: JSON.stringify({ inspectionId }),
      });

      if (!checkout.success) {
        throw new Error(checkout.message || "Unable to initialize lease setup payment.");
      }

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
          ...draft,
          startDate: new Date(`${startDate}T00:00:00`).toISOString(),
          endDate: new Date(`${endDate}T00:00:00`).toISOString(),
        }),
      });

      sessionStorage.removeItem(`aviritech:lease-setup:${inspectionId}`);
      setSuccess("Lease setup saved. Continue with the tenancy activation workflow.");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to set up the lease.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div>
        <h3 className="font-semibold text-black">Lease setup</h3>
        <p className="mt-1 text-sm leading-5 text-black/60">
          Set the tenancy dates and rent terms. The existing contract-generation payment may be required.
        </p>
      </div>

      {success && <p role="status" className="text-sm font-medium text-emerald-800">{success}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {!open ? (
        <button
          type="button"
          onClick={() => { setError(""); setOpen(true); }}
          className="min-h-11 rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-black hover:brightness-95"
        >
          Set Up Lease
        </button>
      ) : (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-black/70">Start date</label>
            <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-black/70">End date</label>
            <input required type="date" min={startDate || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-black/70">Rent frequency</label>
            <select value={rentFrequency} onChange={(e) => setRentFrequency(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">
              {FREQUENCIES.map((frequency) => (
                <option key={frequency} value={frequency}>{frequency.replaceAll("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-black/70">Rent amount (NGN)</label>
            <input required type="number" min="1" step="0.01" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-black/70">Security deposit (NGN, optional)</label>
            <input type="number" min="0" step="0.01" value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
            <button type="button" disabled={creating} onClick={() => setOpen(false)}
              className="min-h-10 rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={creating}
              className="min-h-10 rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">
              {creating ? "Processing…" : "Continue"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
