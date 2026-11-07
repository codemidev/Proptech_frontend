"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";

type ApiResponse<T> = { success: boolean; data: T; message?: string };
type DroneStatus = "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "INACTIVE";
type MissionStatus = "REQUESTED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED";

type DroneOwner = {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone: string;
  status: string;
  _count?: { drones: number };
};

type Drone = {
  id: string;
  ownerId: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  operatingRadiusKm: number | string;
  cameraCapabilities: string[];
  sensorCapabilities: string[];
  baseLatitude?: number | string | null;
  baseLongitude?: number | string | null;
  status: DroneStatus;
  owner?: DroneOwner;
  registeredByAgent?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
};

type Recommendation = Drone & {
  distanceKm: number | null;
  withinOperatingRadius: boolean;
  recommendationReason: string;
};

type AeroRequest = {
  id: string;
  status: MissionStatus;
  createdAt: string;
  manualOverride?: boolean;
  assignmentNotes?: string | null;
  property: {
    id: string;
    title?: string | null;
    propertyCode?: string | null;
    coordinates?: Array<{ latitude: number | string; longitude: number | string }>;
    address?: {
      addressLine1?: string | null;
      city?: { name: string } | null;
      state?: { name: string } | null;
    } | null;
  };
  owner?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  payment?: {
    reference?: string | null;
    status: string;
    amount: number | string;
    currency: string;
  } | null;
  assignedDrone?: Drone | null;
};

type Overview = {
  drones: Drone[];
  owners: DroneOwner[];
  requests: AeroRequest[];
  counts: {
    drones: number;
    availableDrones: number;
    requests: number;
    awaitingAssignment: number;
  };
};

const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-yellow-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function money(value?: number | string, currency = "NGN") {
  if (value == null) return "—";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(amount)
    : String(value);
}

function locationLabel(request: AeroRequest) {
  const address = request.property.address;
  return [address?.addressLine1, address?.city?.name, address?.state?.name]
    .filter(Boolean).join(", ") || "Location not recorded";
}

export default function AdminAeroPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [overview, setOverview] = useState<Overview>({
    drones: [], owners: [], requests: [],
    counts: { drones: 0, availableDrones: 0, requests: 0, awaitingAssignment: 0 },
  });
  const [recommendations, setRecommendations] = useState<Record<string, Recommendation[]>>({});
  const [selectedDrone, setSelectedDrone] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<ApiResponse<Overview>>("/api/v1/admin/aero", getToken);
      if (!response.success || !response.data) throw new Error(response.message || "Invalid Aero overview response.");
      setOverview(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load organization Aero data.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isLoaded && isSignedIn) void load();
    else if (isLoaded) setLoading(false);
  }, [isLoaded, isSignedIn, load]);

  const visibleRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return overview.requests.filter((request) => {
      const matchesStatus = filter === "ALL" || request.status === filter;
      const matchesSearch = !term || [
        request.property?.title,
        request.property?.propertyCode,
        request.property?.address?.addressLine1,
        request.property?.address?.city?.name,
        request.property?.address?.state?.name,
        request.owner?.email,
        request.payment?.reference,
        request.assignedDrone?.serialNumber,
      ].some((value) => String(value ?? "").toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [overview.requests, search, filter]);

  async function getRecommendations(request: AeroRequest) {
    setBusyId(request.id);
    setError("");
    try {
      const response = await apiFetch<ApiResponse<Recommendation[]>>(
        `/api/v1/admin/aero/requests/${request.id}/recommendations`,
        getToken,
      );
      setRecommendations((current) => ({ ...current, [request.id]: response.data ?? [] }));
      if (!response.data?.length) setNotice("No available organizational drones found.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load drone recommendations.");
    } finally {
      setBusyId("");
    }
  }

  async function assignDrone(request: AeroRequest) {
    const droneId = selectedDrone[request.id];
    if (!droneId) {
      setError("Select a drone before assigning it.");
      return;
    }
    const recommendation = recommendations[request.id]?.find((drone) => drone.id === droneId);
    let overrideReason: string | undefined;

    if (!recommendation?.withinOperatingRadius) {
      const reason = window.prompt(
        "The drone is outside its confirmed operating radius or its location cannot be confirmed. Enter a reason for the manual assignment:",
      )?.trim();
      if (!reason || reason.length < 10) {
        setError("A manual assignment reason of at least 10 characters is required.");
        return;
      }
      overrideReason = reason;
    }

    setBusyId(request.id);
    setError("");
    setNotice("");
    try {
      await apiFetch(`/api/v1/admin/aero/requests/${request.id}/assign`, getToken, {
        method: "POST",
        body: JSON.stringify({ droneId, overrideReason }),
      });
      setNotice("Drone assigned to Aero request.");
      setRecommendations((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Drone assignment failed.");
    } finally {
      setBusyId("");
    }
  }

  async function updateMission(request: AeroRequest, status: "IN_PROGRESS" | "COMPLETED") {
    if (!window.confirm(`Confirm the real-world mission is ready to be marked ${label(status)}?`)) return;
    setBusyId(request.id);
    setError("");
    setNotice("");
    try {
      await apiFetch(`/api/v1/admin/aero/requests/${request.id}/mission-status`, getToken, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      setNotice(`Mission updated to ${label(status)}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mission update failed.");
    } finally {
      setBusyId("");
    }
  }

  async function updateDroneStatus(drone: Drone, status: DroneStatus) {
    setBusyId(drone.id);
    setError("");
    setNotice("");
    try {
      await apiFetch(`/api/v1/admin/aero/drones/${drone.id}/status`, getToken, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setNotice(`${drone.serialNumber}: ${label(status)}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Drone status update failed.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] p-4 text-slate-900 dark:bg-slate-950 dark:text-white sm:p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard/admin" className="text-sm font-semibold text-slate-600 hover:text-black dark:text-slate-300">
          ← Admin dashboard
        </Link>

        <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-yellow-700">AVIRITECH PROPTECH · AERO</p>
            <h1 className="mt-2 text-3xl font-black">Aero operations oversight</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Organization-wide oversight of enrolled drone owners, registered aircraft and paid property inspection missions.
            </p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">
            {loading ? "Refreshing…" : "Refresh overview"}
          </button>
        </header>

        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Registered drones", overview.counts.drones],
            ["Available drones", overview.counts.availableDrones],
            ["Paid requests", overview.counts.requests],
            ["Awaiting assignment", overview.counts.awaitingAssignment],
          ].map(([title, value]) => (
            <div key={title} className={cardClass}>
              <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-black">Organization drone fleet</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Fleet entries registered by agents across this organization.</p>
          {loading ? <div className={cardClass + " mt-4"}>Loading fleet…</div> : overview.drones.length === 0 ? (
            <div className={cardClass + " mt-4 text-sm text-slate-500"}>No registered drones found.</div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
                  <tr><th className="p-4">Drone</th><th className="p-4">Owner</th><th className="p-4">Agent registration</th><th className="p-4">Range</th><th className="p-4">Status</th></tr>
                </thead>
                <tbody>
                  {overview.drones.map((drone) => (
                    <tr key={drone.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-4"><p className="font-bold">{drone.manufacturer} {drone.model}</p><p className="mt-1 text-xs text-slate-500">{drone.serialNumber}</p></td>
                      <td className="p-4">{drone.owner?.name ?? "—"}<p className="mt-1 text-xs text-slate-500">{drone.owner?.phone}</p></td>
                      <td className="p-4 text-xs text-slate-500">
                        {[
                          drone.registeredByAgent?.firstName,
                          drone.registeredByAgent?.lastName,
                        ].filter(Boolean).join(" ") || drone.registeredByAgent?.email || "Not recorded"}
                      </td>
                      <td className="p-4">{drone.operatingRadiusKm} km</td>
                      <td className="p-4">
                        <select
                          aria-label={`Update status for ${drone.serialNumber}`}
                          className={inputClass}
                          value={drone.status}
                          disabled={busyId === drone.id || drone.status === "ASSIGNED"}
                          onChange={(e) => void updateDroneStatus(drone, e.target.value as DroneStatus)}
                        >
                          <option value="AVAILABLE">Available</option>
                          <option value="ASSIGNED" disabled>Assigned</option>
                          <option value="MAINTENANCE">Maintenance</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8">
          <div>
            <h2 className="text-xl font-black">Paid Aero request queue</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Only successfully paid requests are returned by the backend.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <input className={inputClass + " min-w-[240px] flex-1"} placeholder="Search property, owner, location or payment reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className={inputClass + " sm:w-56"} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="REQUESTED">Awaiting assignment</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="mt-4 space-y-4">
            {loading ? <div className={cardClass}>Loading paid requests…</div> : visibleRequests.length === 0 ? (
              <div className={cardClass + " text-sm text-slate-500"}>No requests match this filter.</div>
            ) : visibleRequests.map((request) => {
              const options = recommendations[request.id] ?? [];
              const canAssign = request.status === "REQUESTED" && !request.assignedDrone;
              return (
                <article key={request.id} className={cardClass}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-yellow-700">Aero request · {request.id.slice(-8)}</p>
                      <h3 className="mt-1 text-lg font-bold">{request.property.title || "Property inspection"}</h3>
                      <p className="mt-1 text-sm text-slate-500">{request.property.propertyCode || request.property.id}</p>
                      <p className="mt-1 text-sm text-slate-500">{locationLabel(request)}</p>
                    </div>
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-900">{label(request.status)}</span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div><p className="text-slate-500">Owner</p><p className="mt-1 font-medium">{[request.owner?.firstName, request.owner?.lastName].filter(Boolean).join(" ") || request.owner?.email || "—"}</p></div>
                    <div><p className="text-slate-500">Verified payment</p><p className="mt-1 font-medium">{money(request.payment?.amount, request.payment?.currency)} · {request.payment?.status ?? "—"}</p></div>
                    <div><p className="text-slate-500">Payment reference</p><p className="mt-1 break-all font-medium">{request.payment?.reference || "—"}</p></div>
                  </div>

                  {request.assignedDrone && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
                      <strong>Assigned drone:</strong> {request.assignedDrone.manufacturer} {request.assignedDrone.model} · {request.assignedDrone.serialNumber}
                      {request.manualOverride && <p className="mt-1 text-xs text-amber-700">Manual override: {request.assignmentNotes || "Reason not supplied"}</p>}
                    </div>
                  )}

                  {canAssign && (
                    <div className="mt-4">
                      <button disabled={busyId === request.id} onClick={() => void getRecommendations(request)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800">
                        {busyId === request.id ? "Loading…" : "Find suitable available drones"}
                      </button>
                      {recommendations[request.id] && (
                        <div className="mt-3 space-y-3">
                          {options.length === 0 ? <p className="text-sm text-slate-500">No available organizational drones found.</p> : (
                            <>
                              <select className={inputClass} value={selectedDrone[request.id] || ""} onChange={(e) => setSelectedDrone((current) => ({ ...current, [request.id]: e.target.value }))}>
                                <option value="">Choose a drone</option>
                                {options.map((drone) => <option key={drone.id} value={drone.id}>{drone.manufacturer} {drone.model} · {drone.serialNumber} · {drone.distanceKm == null ? "Range unconfirmed" : `${drone.distanceKm} km`} · {drone.withinOperatingRadius ? "Within radius" : "Override required"}</option>)}
                              </select>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {options.map((drone) => (
                                  <div key={drone.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700">
                                    <p className="font-bold">{drone.manufacturer} {drone.model}</p>
                                    <p className="mt-1 text-slate-500">{drone.recommendationReason}</p>
                                    <p className="mt-1 text-slate-500">Distance: {drone.distanceKm == null ? "Unconfirmed" : `${drone.distanceKm} km`} · Radius: {drone.operatingRadiusKm} km</p>
                                  </div>
                                ))}
                              </div>
                              <button disabled={!selectedDrone[request.id] || busyId === request.id} onClick={() => void assignDrone(request)} className="rounded-xl bg-[#FACC15] px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">
                                {busyId === request.id ? "Assigning…" : "Assign selected drone"}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {request.status === "ASSIGNED" && <button disabled={busyId === request.id} onClick={() => void updateMission(request, "IN_PROGRESS")} className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 dark:bg-yellow-400 dark:text-slate-950">Start mission</button>}
                  {request.status === "IN_PROGRESS" && <button disabled={busyId === request.id} onClick={() => void updateMission(request, "COMPLETED")} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Mark mission completed</button>}
                  {request.status === "COMPLETED" && <p className="mt-4 text-sm font-semibold text-emerald-700">Mission marked completed.</p>}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
