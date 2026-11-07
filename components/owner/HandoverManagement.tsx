"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { GetToken } from "@/lib/api";
import { apiFetch } from "@/lib/api";

type MoveInRecord = {
  id: string;
  handoverStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  keyCollectedAt: string | null;
  keyCollectionMethod: "DELIVERY" | "PHYSICAL_PICKUP" | null;
  electricityMeterNumber: string | null;
  electricityMeterReading: string | null;
  waterMeterNumber: string | null;
  waterMeterReading: string | null;
  lease: {
    id: string;
    property: { title: string };
    tenant: { firstName: string | null; lastName: string | null };
  };
};

type MoveInListResponse = { success: boolean; data: MoveInRecord[] };

export function HandoverManagement({ getToken }: { getToken: GetToken }) {
  const [records, setRecords] = useState<MoveInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [electricityMeterNumber, setElectricityMeterNumber] = useState("");
  const [electricityMeterReading, setElectricityMeterReading] = useState("");
  const [waterMeterNumber, setWaterMeterNumber] = useState("");
  const [waterMeterReading, setWaterMeterReading] = useState("");

  async function load() {
    try {
      setError("");
      const res = await apiFetch<MoveInListResponse>("/api/v1/move-in", getToken);
      setRecords(res.data.filter((r) => r.handoverStatus !== "COMPLETED" || !r.keyCollectedAt));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load move-ins");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEditing(record: MoveInRecord) {
    setOpenId(record.id);
    setElectricityMeterNumber(record.electricityMeterNumber ?? "");
    setElectricityMeterReading(record.electricityMeterReading ?? "");
    setWaterMeterNumber(record.waterMeterNumber ?? "");
    setWaterMeterReading(record.waterMeterReading ?? "");
  }

  async function handleComplete(event: FormEvent, id: string) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      await apiFetch(`/api/v1/move-in/${id}`, getToken, {
        method: "PATCH",
        body: JSON.stringify({
          electricityMeterNumber: electricityMeterNumber || undefined,
          electricityMeterReading: electricityMeterReading
            ? Number(electricityMeterReading)
            : undefined,
          waterMeterNumber: waterMeterNumber || undefined,
          waterMeterReading: waterMeterReading ? Number(waterMeterReading) : undefined,
          handoverStatus: "COMPLETED",
        }),
      });

      setOpenId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update handover.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmKeysCollected(id: string) {
    try {
      setSaving(true);
      setError("");
      await apiFetch(`/api/v1/move-in/${encodeURIComponent(id)}`, getToken, {
        method: "PATCH",
        body: JSON.stringify({
          handoverStatus: "COMPLETED",
          confirmKeyCollection: true,
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record key collection.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;
  if (records.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-gray-900">Move-in Handovers</h2>
      <p className="text-sm text-gray-500 mt-1">
        New tenancies awaiting key handover and meter readings.
      </p>

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-4">
        {records.map((record) => (
          <article
            key={record.id}
            className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {record.lease.property.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Tenant: {record.lease.tenant.firstName} {record.lease.tenant.lastName}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Key collection:{" "}
                  {record.keyCollectionMethod
                    ? record.keyCollectionMethod.replace("_", " ")
                    : "Not selected yet"}
                </p>
              </div>

              {openId !== record.id && (
                record.handoverStatus === "COMPLETED" ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => confirmKeysCollected(record.id)}
                    className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Confirm Keys Collected"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditing(record)}
                    className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
                  >
                    Complete Handover
                  </button>
                )
              )}
            </div>

            {openId === record.id && (
              <form
                onSubmit={(event) => handleComplete(event, record.id)}
                className="mt-4 grid grid-cols-2 gap-3"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Electricity Meter No.
                  </label>
                  <input
                    value={electricityMeterNumber}
                    onChange={(e) => setElectricityMeterNumber(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Electricity Reading
                  </label>
                  <input
                    type="number"
                    value={electricityMeterReading}
                    onChange={(e) => setElectricityMeterReading(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Water Meter No.
                  </label>
                  <input
                    value={waterMeterNumber}
                    onChange={(e) => setWaterMeterNumber(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Water Reading
                  </label>
                  <input
                    type="number"
                    value={waterMeterReading}
                    onChange={(e) => setWaterMeterReading(e.target.value)}
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
                    disabled={saving}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Mark Handover Complete"}
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
