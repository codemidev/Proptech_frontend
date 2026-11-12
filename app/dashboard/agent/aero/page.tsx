"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

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
  assignedAt?: string | null;
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
    phoneNumber?: string | null;
  } | null;
  payment?: {
    reference?: string | null;
    status: string;
    amount: number | string;
    currency: string;
  } | null;
  assignedDrone?: Drone | null;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function locationLabel(request: AeroRequest) {
  const address = request.property.address;
  return [
    address?.addressLine1,
    address?.city?.name,
    address?.state?.name,
  ].filter(Boolean).join(", ") || "Location not recorded";
}

function money(value?: number | string, currency = "NGN") {
  if (value == null) return "—";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(amount)
    : String(value);
}

export default function AgentAeroPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [owners, setOwners] = useState<DroneOwner[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [requests, setRequests] = useState<AeroRequest[]>([]);
  const [recommendations, setRecommendations] = useState<Record<string, Recommendation[]>>({});
  const [selectedDrone, setSelectedDrone] = useState<Record<string, string>>({});

  const [ownerForm, setOwnerForm] = useState({
    name: "", companyName: "", email: "", phone: "",
  });
  const [droneForm, setDroneForm] = useState({
    ownerId: "", serialNumber: "", manufacturer: "", model: "",
    operatingRadiusKm: "10", cameraCapabilities: "", sensorCapabilities: "",
    baseLatitude: "", baseLongitude: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const availableDrones = useMemo(
    () => drones.filter((drone) => drone.status === "AVAILABLE"),
    [drones],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ownerResult, droneResult, requestResult] = await Promise.all([
        apiFetch<ApiResponse<DroneOwner[]>>("/api/v1/agents/aero/owners", getToken),
        apiFetch<ApiResponse<Drone[]>>("/api/v1/agents/aero/drones", getToken),
        apiFetch<ApiResponse<AeroRequest[]>>("/api/v1/agents/aero/requests", getToken),
      ]);

      if (!ownerResult.success || !droneResult.success || !requestResult.success) {
        throw new Error("The Aero workspace returned an incomplete response.");
      }

      setOwners(Array.isArray(ownerResult.data) ? ownerResult.data : []);
      setDrones(Array.isArray(droneResult.data) ? droneResult.data : []);
      setRequests(Array.isArray(requestResult.data) ? requestResult.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load the Aero workspace.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isLoaded && isSignedIn) void load();
    else if (isLoaded) setLoading(false);
  }, [isLoaded, isSignedIn, load]);

  async function submitOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiFetch("/api/v1/agents/aero/owners", getToken, {
        method: "POST",
        body: JSON.stringify(ownerForm),
      });
      setOwnerForm({ name: "", companyName: "", email: "", phone: "" });
      setNotice("Drone owner enrolled.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enroll drone owner.");
    } finally {
      setSaving(false);
    }
  }

  async function submitDrone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiFetch("/api/v1/agents/aero/drones", getToken, {
        method: "POST",
        body: JSON.stringify({
          ...droneForm,
          operatingRadiusKm: Number(droneForm.operatingRadiusKm),
          baseLatitude: droneForm.baseLatitude || null,
          baseLongitude: droneForm.baseLongitude || null,
          cameraCapabilities: droneForm.cameraCapabilities.split(",").map((x) => x.trim()).filter(Boolean),
          sensorCapabilities: droneForm.sensorCapabilities.split(",").map((x) => x.trim()).filter(Boolean),
        }),
      });
      setDroneForm({
        ownerId: "", serialNumber: "", manufacturer: "", model: "",
        operatingRadiusKm: "10", cameraCapabilities: "", sensorCapabilities: "",
        baseLatitude: "", baseLongitude: "",
      });
      setNotice("Drone registered to your agent workspace.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register drone.");
    } finally {
      setSaving(false);
    }
  }

  async function updateDroneStatus(drone: Drone, status: DroneStatus) {
    setBusyId(drone.id);
    setError("");
    setNotice("");
    try {
      await apiFetch(`/api/v1/agents/aero/drones/${drone.id}/status`, getToken, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setNotice(`${drone.serialNumber}: ${label(status)}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update drone status.");
    } finally {
      setBusyId("");
    }
  }

  async function getRecommendations(request: AeroRequest) {
    setBusyId(request.id);
    setError("");
    try {
      const result = await apiFetch<ApiResponse<Recommendation[]>>(
        `/api/v1/agents/aero/requests/${request.id}/recommendations`,
        getToken,
      );
      setRecommendations((current) => ({ ...current, [request.id]: result.data ?? [] }));
      if (!result.data?.length) setNotice("No available drones are registered in your fleet.");
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

    const recommendation = recommendations[request.id]?.find((item) => item.id === droneId);
    let overrideReason: string | undefined;

    if (!recommendation?.withinOperatingRadius) {
      const reason = window.prompt(
        "The drone is outside its confirmed operating radius or its location cannot be confirmed. Enter the reason for this manual assignment:",
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
      await apiFetch(`/api/v1/agents/aero/requests/${request.id}/assign`, getToken, {
        method: "POST",
        body: JSON.stringify({ droneId, overrideReason }),
      });
      setNotice("Drone assigned to the paid Aero request.");
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
    const action = status === "IN_PROGRESS" ? "start this mission" : "mark this mission completed";
    if (!window.confirm(`Confirm you want to ${action}? Only do this when the real-world operation supports this status.`)) return;

    setBusyId(request.id);
    setError("");
    setNotice("");
    try {
      await apiFetch(`/api/v1/agents/aero/requests/${request.id}/mission-status`, getToken, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      setNotice(`Mission status updated to ${label(status)}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update mission status.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] p-4 text-slate-900 dark:bg-slate-950 dark:text-white sm:p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard/agent" className="text-sm font-semibold text-slate-600 hover:text-black dark:text-slate-300">
          ← Agent dashboard
        </Link>

        <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-yellow-700">AVIRITECH PROPTECH · AERO</p>
            <h1 className="mt-2 text-3xl font-black">Drone operations</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Enroll drone owners, register fleet assets and manage paid property inspection missions assigned to you.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/agent/aero/simulator"
              className="inline-flex items-center gap-2 rounded-xl border border-yellow-400 bg-slate-900 px-4 py-3 text-sm font-bold text-yellow-300 transition hover:bg-slate-800"
            >
              <span aria-hidden="true">✦</span>
              Flight Simulator
            </Link>
            <button onClick={() => void load()} disabled={loading} className="rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">
              {loading ? "Refreshing…" : "Refresh workspace"}
            </button>
          </div>
        </header>

        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Enrolled owners", owners.length],
            ["Registered drones", drones.length],
            ["Available drones", availableDrones.length],
            ["Paid requests in workspace", requests.length],
          ].map(([title, value]) => (
            <div key={title} className={cardClass}>
              <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </div>
          ))}
        </section>

        <div className="mt-7 grid gap-5 xl:grid-cols-2">
          <section className={cardClass}>
            <h2 className="text-lg font-bold">Enroll a drone owner</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Owners enrolled here are managed within your agent workspace.</p>
            <form onSubmit={submitOwner} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input className={inputClass} placeholder="Owner's full name *" required value={ownerForm.name} onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })} />
              <input className={inputClass} placeholder="Company (optional)" value={ownerForm.companyName} onChange={(e) => setOwnerForm({ ...ownerForm, companyName: e.target.value })} />
              <input className={inputClass} type="email" placeholder="Email (optional)" value={ownerForm.email} onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })} />
              <input className={inputClass} placeholder="Phone number *" required value={ownerForm.phone} onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })} />
              <button disabled={saving} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50 dark:bg-yellow-400 dark:text-slate-950 sm:col-span-2">
                {saving ? "Saving…" : "Enroll owner"}
              </button>
            </form>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-bold">Register a drone</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Register the aircraft and its actual operating base and capabilities.</p>
            <form onSubmit={submitDrone} className="mt-4 grid gap-3 sm:grid-cols-2">
              <select className={inputClass} required value={droneForm.ownerId} onChange={(e) => setDroneForm({ ...droneForm, ownerId: e.target.value })}>
                <option value="">Select enrolled owner *</option>
                {owners.filter((owner) => owner.status === "ACTIVE").map((owner) => <option key={owner.id} value={owner.id}>{owner.name}{owner.companyName ? ` · ${owner.companyName}` : ""}</option>)}
              </select>
              <input className={inputClass} required placeholder="Serial number *" value={droneForm.serialNumber} onChange={(e) => setDroneForm({ ...droneForm, serialNumber: e.target.value })} />
              <input className={inputClass} required placeholder="Manufacturer *" value={droneForm.manufacturer} onChange={(e) => setDroneForm({ ...droneForm, manufacturer: e.target.value })} />
              <input className={inputClass} required placeholder="Model *" value={droneForm.model} onChange={(e) => setDroneForm({ ...droneForm, model: e.target.value })} />
              <input className={inputClass} required type="number" min="0.1" max="1000" step="0.1" placeholder="Operating radius (km) *" value={droneForm.operatingRadiusKm} onChange={(e) => setDroneForm({ ...droneForm, operatingRadiusKm: e.target.value })} />
              <input className={inputClass} placeholder="Camera capabilities (comma separated)" value={droneForm.cameraCapabilities} onChange={(e) => setDroneForm({ ...droneForm, cameraCapabilities: e.target.value })} />
              <input className={inputClass} placeholder="Sensor capabilities (comma separated)" value={droneForm.sensorCapabilities} onChange={(e) => setDroneForm({ ...droneForm, sensorCapabilities: e.target.value })} />
              <input className={inputClass} type="number" step="any" min="-90" max="90" placeholder="Base latitude (optional)" value={droneForm.baseLatitude} onChange={(e) => setDroneForm({ ...droneForm, baseLatitude: e.target.value })} />
              <input className={inputClass} type="number" step="any" min="-180" max="180" placeholder="Base longitude (optional)" value={droneForm.baseLongitude} onChange={(e) => setDroneForm({ ...droneForm, baseLongitude: e.target.value })} />
              <button disabled={saving || owners.length === 0} className="rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50 sm:col-span-2">
                {saving ? "Saving…" : "Register drone"}
              </button>
            </form>
            {owners.length === 0 && <p className="mt-2 text-xs text-amber-700">Enroll a drone owner before registering a drone.</p>}
          </section>
        </div>

        <section className="mt-7">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">My registered fleet</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Only drones registered by your agent account appear here.</p>
            </div>
          </div>
          {loading ? <div className={cardClass}>Loading fleet…</div> : drones.length === 0 ? (
            <div className={cardClass + " text-sm text-slate-500"}>No drones registered yet.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {drones.map((drone) => (
                <article key={drone.id} className={cardClass}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold">{drone.manufacturer} {drone.model}</h3>
                      <p className="mt-1 text-xs text-slate-500">{drone.serialNumber}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">{label(drone.status)}</span>
                  </div>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Owner</dt><dd className="text-right font-medium">{drone.owner?.name ?? "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Operating radius</dt><dd>{drone.operatingRadiusKm} km</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Base coordinates</dt><dd>{drone.baseLatitude != null && drone.baseLongitude != null ? `${drone.baseLatitude}, ${drone.baseLongitude}` : "Not recorded"}</dd></div>
                  </dl>
                  <div className="mt-3 text-xs text-slate-500">Camera: {drone.cameraCapabilities?.join(", ") || "Not specified"}</div>
                  <div className="mt-1 text-xs text-slate-500">Sensors: {drone.sensorCapabilities?.join(", ") || "Not specified"}</div>
                  <select
                    aria-label={`Update status for ${drone.serialNumber}`}
                    className={inputClass + " mt-4"}
                    value={drone.status}
                    disabled={busyId === drone.id || drone.status === "ASSIGNED"}
                    onChange={(e) => void updateDroneStatus(drone, e.target.value as DroneStatus)}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ASSIGNED" disabled>Assigned</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-black">Paid Aero inspection requests</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Requests are shown only for properties assigned to you and with successful payment.</p>
          <div className="mt-4 space-y-4">
            {loading ? <div className={cardClass}>Loading requests…</div> : requests.length === 0 ? (
              <div className={cardClass + " text-sm text-slate-500"}>No paid Aero requests are assigned to your workspace.</div>
            ) : requests.map((request) => {
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
                    <div><p className="text-slate-500">Property owner</p><p className="mt-1 font-medium">{[request.owner?.firstName, request.owner?.lastName].filter(Boolean).join(" ") || request.owner?.email || "—"}</p></div>
                    <div><p className="text-slate-500">Payment</p><p className="mt-1 font-medium">{money(request.payment?.amount, request.payment?.currency)} · {request.payment?.status ?? "—"}</p></div>
                    <div><p className="text-slate-500">Payment reference</p><p className="mt-1 break-all font-medium">{request.payment?.reference || "—"}</p></div>
                  </div>

                  {request.assignedDrone && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
                      <strong>Assigned drone:</strong> {request.assignedDrone.manufacturer} {request.assignedDrone.model} · {request.assignedDrone.serialNumber}
                      {request.manualOverride && <p className="mt-1 text-xs text-amber-700">Manual range override: {request.assignmentNotes || "Reason not supplied"}</p>}
                    </div>
                  )}

                  {canAssign && (
                    <div className="mt-4">
                      <button disabled={busyId === request.id} onClick={() => void getRecommendations(request)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800">
                        {busyId === request.id ? "Loading…" : "Find suitable available drones"}
                      </button>
                      {recommendations[request.id] && (
                        <div className="mt-3 space-y-3">
                          {options.length === 0 ? <p className="text-sm text-slate-500">No available drones found in your registered fleet.</p> : (
                            <>
                              <select className={inputClass} value={selectedDrone[request.id] || ""} onChange={(e) => setSelectedDrone((current) => ({ ...current, [request.id]: e.target.value }))}>
                                <option value="">Choose a drone</option>
                                {options.map((drone) => (
                                  <option key={drone.id} value={drone.id}>
                                    {drone.manufacturer} {drone.model} · {drone.serialNumber} · {drone.distanceKm == null ? "Range unconfirmed" : `${drone.distanceKm} km`} · {drone.withinOperatingRadius ? "Within radius" : "Override required"}
                                  </option>
                                ))}
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

                  {request.status === "ASSIGNED" && (
                    <button disabled={busyId === request.id} onClick={() => void updateMission(request, "IN_PROGRESS")} className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 dark:bg-yellow-400 dark:text-slate-950">
                      {busyId === request.id ? "Updating…" : "Start mission"}
                    </button>
                  )}
                  {request.status === "IN_PROGRESS" && (
                    <button disabled={busyId === request.id} onClick={() => void updateMission(request, "COMPLETED")} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                      {busyId === request.id ? "Updating…" : "Mark mission completed"}
                    </button>
                  )}
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
