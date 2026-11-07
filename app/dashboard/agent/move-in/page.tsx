"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

type HandoverStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

type MoveInRecord = {
  id: string;
  handoverStatus: HandoverStatus;
  handoverNotes?: string | null;
  electricityMeterNumber?: string | null;
  electricityMeterReading?: number | null;
  waterMeterNumber?: string | null;
  waterMeterReading?: number | null;
  handoverAt?: string | null;
  keyCollectedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lease?: {
    id: string;
    leaseNumber?: string | null;
    status?: string;
    startDate?: string | null;
    endDate?: string | null;
    tenant?: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phoneNumber?: string | null;
    } | null;
    landlord?: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phoneNumber?: string | null;
    } | null;
    property?: {
      id: string;
      title?: string | null;
      address?: {
        addressLine1?: string | null;
        addressLine2?: string | null;
        city?: string | null;
        state?: string | null;
      } | null;
    } | null;
  } | null;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

type HandoverForm = {
  handoverStatus: HandoverStatus;
  electricityMeterNumber: string;
  electricityMeterReading: string;
  waterMeterNumber: string;
  waterMeterReading: string;
  handoverNotes: string;
};

const emptyForm: HandoverForm = {
  handoverStatus: "IN_PROGRESS",
  electricityMeterNumber: "",
  electricityMeterReading: "",
  waterMeterNumber: "",
  waterMeterReading: "",
  handoverNotes: "",
};

function displayName(person?: MoveInRecord["lease"] extends infer L
  ? L extends { tenant?: infer T } ? T : never
  : never) {
  if (!person || typeof person !== "object") return "Tenant";
  const value = person as {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  const name = [value.firstName, value.lastName].filter(Boolean).join(" ");
  return name || value.email || "Tenant";
}

function dateLabel(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function statusLabel(status: HandoverStatus) {
  return status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function statusStyle(status: HandoverStatus) {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  if (status === "IN_PROGRESS") return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function makeForm(record: MoveInRecord): HandoverForm {
  return {
    handoverStatus:
      record.handoverStatus === "PENDING" ||
      record.handoverStatus === "IN_PROGRESS" ||
      record.handoverStatus === "COMPLETED"
        ? record.handoverStatus
        : "IN_PROGRESS",
    electricityMeterNumber: record.electricityMeterNumber ?? "",
    electricityMeterReading:
      record.electricityMeterReading == null
        ? ""
        : String(record.electricityMeterReading),
    waterMeterNumber: record.waterMeterNumber ?? "",
    waterMeterReading:
      record.waterMeterReading == null
        ? ""
        : String(record.waterMeterReading),
    handoverNotes: record.handoverNotes ?? "",
  };
}

export default function AgentMoveInPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [records, setRecords] = useState<MoveInRecord[]>([]);
  const [forms, setForms] = useState<Record<string, HandoverForm>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const result = await apiFetch<ApiResponse<MoveInRecord[]>>(
        "/api/v1/move-in/agent/assigned",
        getToken,
      );
      if (!result.success || !Array.isArray(result.data)) {
        throw new Error(result.message || "Unexpected move-in response.");
      }
      setRecords(result.data);
      setForms((current) => {
        const next = { ...current };
        for (const record of result.data) {
          if (!next[record.id]) next[record.id] = makeForm(record);
        }
        return next;
      });
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load assigned move-ins. Please retry.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isLoaded && isSignedIn) void loadRecords();
    else if (isLoaded && !isSignedIn) {
      setLoading(false);
      setLoadError("Sign in to view move-ins assigned to you.");
    }
  }, [isLoaded, isSignedIn, loadRecords]);

  function updateForm(id: string, patch: Partial<HandoverForm>) {
    setForms((current) => ({
      ...current,
      [id]: { ...(current[id] ?? emptyForm), ...patch },
    }));
    setMessages((current) => ({ ...current, [id]: "" }));
    setErrors((current) => ({ ...current, [id]: "" }));
  }

  async function saveHandover(record: MoveInRecord) {
    const form = forms[record.id] ?? makeForm(record);
    if (record.handoverStatus === "COMPLETED") return;

    const numberFields = [
      ["Electricity meter reading", form.electricityMeterReading],
      ["Water meter reading", form.waterMeterReading],
    ] as const;

    for (const [label, value] of numberFields) {
      if (value.trim() && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        setErrors((current) => ({
          ...current,
          [record.id]: `${label} must be a valid non-negative number.`,
        }));
        return;
      }
    }

    if (form.handoverNotes.length > 2000) {
      setErrors((current) => ({
        ...current,
        [record.id]: "Handover notes cannot exceed 2,000 characters.",
      }));
      return;
    }

    setSavingId(record.id);
    setErrors((current) => ({ ...current, [record.id]: "" }));
    setMessages((current) => ({ ...current, [record.id]: "" }));

    const payload = {
      handoverStatus: form.handoverStatus,
      ...(form.electricityMeterNumber.trim()
        ? { electricityMeterNumber: form.electricityMeterNumber.trim() }
        : {}),
      ...(form.electricityMeterReading.trim()
        ? { electricityMeterReading: Number(form.electricityMeterReading) }
        : {}),
      ...(form.waterMeterNumber.trim()
        ? { waterMeterNumber: form.waterMeterNumber.trim() }
        : {}),
      ...(form.waterMeterReading.trim()
        ? { waterMeterReading: Number(form.waterMeterReading) }
        : {}),
      ...(form.handoverNotes.trim()
        ? { handoverNotes: form.handoverNotes.trim() }
        : {}),
    };

    try {
      const result = await apiFetch<ApiResponse<MoveInRecord>>(
        `/api/v1/move-in/agent/${encodeURIComponent(record.id)}`,
        getToken,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!result.success || !result.data) {
        throw new Error(result.message || "Handover update failed.");
      }

      setRecords((current) =>
        current.map((item) =>
          item.id === record.id ? { ...item, ...result.data } : item,
        ),
      );
      setForms((current) => ({
        ...current,
        [record.id]: makeForm({ ...record, ...result.data }),
      }));
      setMessages((current) => ({
        ...current,
        [record.id]: "Handover details saved successfully.",
      }));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [record.id]:
          error instanceof Error
            ? error.message
            : "Could not save handover details.",
      }));
    } finally {
      setSavingId(null);
    }
  }

  async function confirmKeysCollected(record: MoveInRecord) {
    if (record.handoverStatus !== "COMPLETED" || record.keyCollectedAt) return;

    setSavingId(record.id);
    setErrors((current) => ({ ...current, [record.id]: "" }));
    setMessages((current) => ({ ...current, [record.id]: "" }));

    try {
      const result = await apiFetch<ApiResponse<MoveInRecord>>(
        `/api/v1/move-in/agent/${encodeURIComponent(record.id)}`,
        getToken,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handoverStatus: "COMPLETED",
            confirmKeyCollection: true,
          }),
        },
      );

      if (!result.success || !result.data) {
        throw new Error(result.message || "Key collection confirmation failed.");
      }

      setRecords((current) =>
        current.map((item) =>
          item.id === record.id ? { ...item, ...result.data } : item,
        ),
      );
      setMessages((current) => ({
        ...current,
        [record.id]: "Key collection recorded successfully.",
      }));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [record.id]:
          error instanceof Error
            ? error.message
            : "Could not confirm key collection.",
      }));
    } finally {
      setSavingId(null);
    }
  }

  const filteredRecords = records.filter((record) => {
    const lease = record.lease;
    const property = lease?.property;
    const tenant = displayName(lease?.tenant);
    const address = property?.address;
    const searchable = [
      property?.title,
      address?.addressLine1,
      address?.addressLine2,
      address?.city,
      address?.state,
      tenant,
      lease?.leaseNumber,
      record.handoverStatus,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(query.trim().toLowerCase());
  });

  const completedCount = records.filter(
    (record) => record.handoverStatus === "COMPLETED",
  ).length;
  const activeCount = records.filter(
    (record) => record.handoverStatus === "IN_PROGRESS",
  ).length;
  const pendingCount = records.filter(
    (record) => record.handoverStatus === "PENDING",
  ).length;

  if (!isLoaded || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#facc15]" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading assigned move-ins…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-6 text-slate-900 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/dashboard/agent"
              className="mb-3 inline-flex text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              ← Agent dashboard
            </Link>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7600]">
              AVIRITECH PROPTECH · OPERATIONS
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Move-in & handover
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Coordinate assigned tenant handovers, capture meter readings,
              and record key collection.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadRecords()}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm transition hover:border-slate-300 disabled:opacity-50"
            disabled={loading}
          >
            Refresh records
          </button>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Awaiting handover", value: pendingCount },
            { label: "In progress", value: activeCount },
            { label: "Completed", value: completedCount },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className="mt-3 text-3xl font-bold tracking-tight">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {loadError && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p className="font-bold">Unable to load move-in records</p>
            <p className="mt-1 break-words">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadRecords()}
              className="mt-3 rounded-lg bg-white px-3 py-2 font-bold text-red-800 ring-1 ring-red-200"
            >
              Try again
            </button>
          </div>
        )}

        {!loadError && records.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff7cc] text-2xl">
              ↗
            </div>
            <h2 className="mt-5 text-lg font-bold">No assigned move-ins yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Move-in records will appear here when a lease exists for a
              property assigned to you.
            </p>
          </section>
        ) : records.length > 0 ? (
          <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row">
              <label className="flex-1">
                <span className="sr-only">Search move-ins</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tenant, property, address or lease…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#d6ac00] focus:ring-2 focus:ring-[#facc15]/30"
                />
              </label>
              <p className="self-center text-sm text-slate-500">
                {filteredRecords.length} of {records.length} records
              </p>
            </div>

            <div className="space-y-5">
              {filteredRecords.map((record) => {
                const lease = record.lease;
                const property = lease?.property;
                const tenant = lease?.tenant;
                const address = property?.address;
                const form = forms[record.id] ?? makeForm(record);
                const completed = record.handoverStatus === "COMPLETED";
                const saving = savingId === record.id;

                return (
                  <article
                    key={record.id}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
                  >
                    <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-[#fff7cc] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#765900]">
                            {lease?.leaseNumber || "Lease"}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle(record.handoverStatus)}`}
                          >
                            {statusLabel(record.handoverStatus)}
                          </span>
                        </div>
                        <h2 className="mt-3 text-xl font-bold">
                          {property?.title || "Property handover"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {[address?.addressLine1, address?.addressLine2, address?.city, address?.state]
                            .filter(Boolean)
                            .join(", ") || "Property address not available"}
                        </p>
                      </div>
                      {completed && (
                        <span className="inline-flex shrink-0 items-center rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                          ✓ Handover complete
                        </span>
                      )}
                    </div>

                    <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Tenant
                        </p>
                        <p className="mt-1 font-bold">{displayName(tenant)}</p>
                        {tenant?.phoneNumber && (
                          <p className="mt-1 text-sm text-slate-600">
                            {tenant.phoneNumber}
                          </p>
                        )}
                        {tenant?.email && (
                          <p className="mt-1 break-all text-sm text-slate-500">
                            {tenant.email}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Lease starts
                        </p>
                        <p className="mt-1 font-bold">{dateLabel(lease?.startDate)}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          Lease ends: {dateLabel(lease?.endDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Handover recorded
                        </p>
                        <p className="mt-1 font-bold">{dateLabel(record.handoverAt)}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          Keys collected: {dateLabel(record.keyCollectedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/70 p-5 sm:p-6">
                      <div className="mb-5">
                        <h3 className="font-bold">Handover checklist</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Record meter details and the handover outcome.
                        </p>
                      </div>

                      <fieldset disabled={completed || saving} className="space-y-5 disabled:opacity-75">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-bold text-slate-600">
                              Electricity meter number
                            </span>
                            <input
                              maxLength={100}
                              value={form.electricityMeterNumber}
                              onChange={(event) =>
                                updateForm(record.id, { electricityMeterNumber: event.target.value })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#d6ac00] focus:ring-2 focus:ring-[#facc15]/25"
                              placeholder="Meter number"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-bold text-slate-600">
                              Electricity reading
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={form.electricityMeterReading}
                              onChange={(event) =>
                                updateForm(record.id, { electricityMeterReading: event.target.value })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#d6ac00] focus:ring-2 focus:ring-[#facc15]/25"
                              placeholder="0.00"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-bold text-slate-600">
                              Water meter number
                            </span>
                            <input
                              maxLength={100}
                              value={form.waterMeterNumber}
                              onChange={(event) =>
                                updateForm(record.id, { waterMeterNumber: event.target.value })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#d6ac00] focus:ring-2 focus:ring-[#facc15]/25"
                              placeholder="Meter number"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-bold text-slate-600">
                              Water reading
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={form.waterMeterReading}
                              onChange={(event) =>
                                updateForm(record.id, { waterMeterReading: event.target.value })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#d6ac00] focus:ring-2 focus:ring-[#facc15]/25"
                              placeholder="0.00"
                            />
                          </label>
                        </div>

                        <label className="block max-w-sm">
                          <span className="mb-1.5 block text-xs font-bold text-slate-600">
                            Handover status
                          </span>
                          <select
                            value={form.handoverStatus}
                            onChange={(event) =>
                              updateForm(record.id, {
                                handoverStatus: event.target.value as HandoverStatus,
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#d6ac00] focus:ring-2 focus:ring-[#facc15]/25"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In progress</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold text-slate-600">
                            Handover notes
                          </span>
                          <textarea
                            maxLength={2000}
                            rows={3}
                            value={form.handoverNotes}
                            onChange={(event) =>
                              updateForm(record.id, { handoverNotes: event.target.value })
                            }
                            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#d6ac00] focus:ring-2 focus:ring-[#facc15]/25"
                            placeholder="Condition of the property, keys handed over, outstanding issues…"
                          />
                          <span className="mt-1 block text-right text-xs text-slate-400">
                            {form.handoverNotes.length}/2000
                          </span>
                        </label>
                      </fieldset>

                      {errors[record.id] && (
                        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          {errors[record.id]}
                        </p>
                      )}
                      {messages[record.id] && (
                        <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                          {messages[record.id]}
                        </p>
                      )}

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-500">
                          {completed
                            ? "This handover is locked as completed."
                            : "Save records after verifying the details with the tenant."}
                        </p>
                        {completed && !record.keyCollectedAt ? (
                          <button
                            type="button"
                            onClick={() => void confirmKeysCollected(record)}
                            disabled={saving || loading}
                            className="inline-flex items-center justify-center rounded-xl bg-[#facc15] px-5 py-3 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-[#eab900] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {saving ? "Saving…" : "Confirm Keys Collected"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void saveHandover(record)}
                            disabled={completed || saving || loading}
                            className="inline-flex items-center justify-center rounded-xl bg-[#facc15] px-5 py-3 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-[#eab900] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {saving
                              ? "Saving…"
                              : completed
                                ? record.keyCollectedAt
                                  ? "Keys Collected"
                                  : "Handover completed"
                                : "Save handover"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}

              {filteredRecords.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                  No move-ins match that search.
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
