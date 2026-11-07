"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

type Person = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type LandVaultDocument = {
  id: string;
  type?: string | null;
  title?: string | null;
  fileUrl: string;
  version?: number | null;
  isVerified: boolean;
  uploadedBy?: string | null;
  createdAt: string;
};

type LandVaultEvent = {
  id: string;
  type: string;
  status: string;
  description?: string | null;
  actorId: string;
  metadata?: unknown;
  createdAt: string;
};

type LandVault = {
  id: string;
  vaultCode: string;
  status: string;
  propertyId: string;
  createdAt: string;
  updatedAt: string;
  paymentCompletedAt?: string | null;
  ownerCompletedAt?: string | null;
  ownerSubmittedAt?: string | null;
  agentSubmittedToAdminAt?: string | null;
  adminApprovedAt?: string | null;
  blockchainRequestedAt?: string | null;
  blockchainAnchoredAt?: string | null;
  certifiedAt?: string | null;
  verificationEvents: LandVaultEvent[];
  property: {
    id: string;
    title?: string | null;
    propertyCode?: string | null;
    agentId?: string | null;
    owner?: Person | null;
    agent?: Person | null;
    address?: {
      addressLine1?: string | null;
      city?: string | null;
      state?: string | null;
    } | null;
    documents?: LandVaultDocument[];
    media?: Array<{
      id: string;
      type: string;
      url: string;
      thumbnailUrl?: string | null;
      caption?: string | null;
      isFeatured: boolean;
    }>;
    coordinates?: Array<{
      latitude: number;
      longitude: number;
      pointOrder: number;
    }>;
    parcel?: {
      parcelNumber?: string | null;
      area?: number | null;
      perimeter?: number | null;
      measurementUnit?: string | null;
    } | null;
  };
};

type QueueResponse = {
  success: boolean;
  data: LandVault[];
  message?: string;
};

const personName = (person?: Person | null) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ") ||
  person?.email ||
  "Not available";

const dateLabel = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "—";

export default function AdminLandVaultPage() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<LandVault[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<QueueResponse>(
        "/api/v1/land-vaults/admin/queue",
        getToken,
      );
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load LandVault review queue.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = filter === "ALL" || item.status === filter;
      const matchesSearch =
        !term ||
        [
          item.vaultCode,
          item.property?.title,
          item.property?.propertyCode,
          item.property?.owner?.email,
          item.property?.agent?.email,
          item.property?.address?.city,
          item.property?.address?.state,
        ].some((value) => String(value ?? "").toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [items, search, filter]);

  async function transition(
    item: LandVault,
    toStatus: "ADMIN_APPROVED" | "ADMIN_REJECTED" | "ADMIN_REVIEW",
  ) {
    let description =
      toStatus === "ADMIN_APPROVED"
        ? "LandVault approved by Aviritech administrator after review."
        : toStatus === "ADMIN_REJECTED"
          ? window.prompt("Enter the reason for rejecting this LandVault:")?.trim() ?? ""
          : "LandVault returned to the administrator review queue.";

    if (toStatus === "ADMIN_REJECTED" && !description) return;

    const actionLabel =
      toStatus === "ADMIN_APPROVED"
        ? "approve this LandVault"
        : toStatus === "ADMIN_REJECTED"
          ? "reject this LandVault"
          : "reopen this LandVault for review";

    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) return;

    setBusyId(item.id);
    setError("");
    setNotice("");

    try {
      await apiFetch(`/api/v1/land-vaults/${item.id}/transition`, getToken, {
        method: "POST",
        body: JSON.stringify({
          toStatus,
          description,
          metadata: { source: "admin-land-vault-review" },
        }),
      });
      setNotice(`${item.vaultCode}: ${toStatus.replaceAll("_", " ")} completed.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "LandVault review action failed.");
    } finally {
      setBusyId("");
    }
  }

  const pendingCount = items.filter((item) => item.status === "ADMIN_REVIEW").length;
  const rejectedCount = items.filter((item) => item.status === "ADMIN_REJECTED").length;

  return (
    <main className="min-h-screen bg-[#f7f7f5] p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard/admin" className="text-sm font-semibold text-slate-600 hover:text-black">
          ← Admin dashboard
        </a>

        <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-yellow-700">
              AVIRITECH PROPTECH · LANDVAULTX
            </p>
            <h1 className="mt-2 text-3xl font-black">Land verification review</h1>
            <p className="mt-2 text-sm text-slate-500">
              Review agent-submitted land records, ownership documents, parcel details and location evidence.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh queue"}
          </button>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-slate-500">Total in queue</p>
            <p className="mt-2 text-3xl font-black">{items.length}</p>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-slate-500">Awaiting decision</p>
            <p className="mt-2 text-3xl font-black">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-slate-500">Previously rejected</p>
            <p className="mt-2 text-3xl font-black">{rejectedCount}</p>
          </div>
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search vault, property, owner, agent or location…"
            className="min-w-[240px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-500"
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="ALL">All statuses</option>
            <option value="ADMIN_REVIEW">Awaiting review</option>
            <option value="ADMIN_REJECTED">Rejected</option>
          </select>
        </div>

        <section className="mt-5 space-y-5">
          {loading ? (
            <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">Loading LandVault queue…</div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">
              No LandVault records match this view.
            </div>
          ) : visibleItems.map((item) => {
            const property = item.property;
            const isBusy = busyId === item.id;
            return (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5">
                  <div>
                    <p className="text-xs font-bold tracking-wide text-slate-500">{item.vaultCode} · {property.propertyCode ?? property.id}</p>
                    <h2 className="mt-1 text-xl font-bold">{property.title ?? "Untitled land property"}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {[property.address?.addressLine1, property.address?.city, property.address?.state].filter(Boolean).join(", ") || "Address not supplied"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${item.status === "ADMIN_REVIEW" ? "bg-yellow-100 text-yellow-900" : "bg-red-100 text-red-800"}`}>
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Ownership & assignment</h3>
                    <p className="mt-3 text-sm"><strong>Owner:</strong> {personName(property.owner)}</p>
                    <p className="mt-2 text-sm"><strong>Agent:</strong> {personName(property.agent)}</p>
                    <p className="mt-2 break-all text-xs text-slate-500">{property.agent?.email ?? "No assigned agent email"}</p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Parcel details</h3>
                    <p className="mt-3 text-sm"><strong>Parcel number:</strong> {property.parcel?.parcelNumber ?? "—"}</p>
                    <p className="mt-2 text-sm"><strong>Area:</strong> {property.parcel?.area ?? "—"} {property.parcel?.measurementUnit ?? ""}</p>
                    <p className="mt-2 text-sm"><strong>Perimeter:</strong> {property.parcel?.perimeter ?? "—"} {property.parcel?.measurementUnit ?? ""}</p>
                    <p className="mt-2 text-sm"><strong>Boundary points:</strong> {property.coordinates?.length ?? 0}</p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Lifecycle timestamps</h3>
                    <p className="mt-3 text-xs text-slate-600">Owner completed: {dateLabel(item.ownerCompletedAt)}</p>
                    <p className="mt-2 text-xs text-slate-600">Submitted by agent: {dateLabel(item.agentSubmittedToAdminAt)}</p>
                    <p className="mt-2 text-xs text-slate-600">Last updated: {dateLabel(item.updatedAt)}</p>
                  </div>
                </div>

                <div className="grid gap-5 border-t p-5 lg:grid-cols-2">
                  <div>
                    <h3 className="font-bold">Property documents ({property.documents?.length ?? 0})</h3>
                    {property.documents?.length ? (
                      <ul className="mt-3 space-y-2">
                        {property.documents.map((doc) => (
                          <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                            <div className="min-w-0">
                              <p className="font-semibold">{doc.title ?? doc.type ?? "Document"}</p>
                              <p className="text-xs text-slate-500">Version {doc.version ?? 1} · {doc.isVerified ? "Verified" : "Not verified"}</p>
                            </div>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-700 underline">Open document</a>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-2 text-sm text-slate-500">No property documents returned.</p>}
                  </div>

                  <div>
                    <h3 className="font-bold">Coordinates ({property.coordinates?.length ?? 0})</h3>
                    {property.coordinates?.length ? (
                      <div className="mt-3 space-y-2">
                        {property.coordinates.map((point, index) => (
                          <p key={`${point.pointOrder}-${index}`} className="rounded-lg bg-slate-50 p-2 font-mono text-xs text-slate-700">
                            Point {point.pointOrder}: {point.latitude}, {point.longitude}
                          </p>
                        ))}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${property.coordinates[0].latitude},${property.coordinates[0].longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-xs font-bold text-blue-700 underline"
                        >
                          View first point on map
                        </a>
                      </div>
                    ) : <p className="mt-2 text-sm text-slate-500">No coordinates supplied.</p>}
                  </div>
                </div>

                {property.media?.length ? (
                  <div className="border-t p-5">
                    <h3 className="font-bold">Property media ({property.media.length})</h3>
                    <div className="mt-3 flex gap-3 overflow-x-auto">
                      {property.media.map((media) => (
                        <a key={media.id} href={media.url} target="_blank" rel="noopener noreferrer" className="block w-36 shrink-0">
                          <img src={media.thumbnailUrl || media.url} alt={media.caption || "Property evidence"} className="h-24 w-36 rounded-lg border object-cover" />
                          <span className="mt-1 block truncate text-xs text-slate-500">{media.caption || media.type}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="border-t p-5">
                  <h3 className="font-bold">Verification history</h3>
                  {item.verificationEvents?.length ? (
                    <ol className="mt-3 space-y-3">
                      {item.verificationEvents.map((event) => (
                        <li key={event.id} className="border-l-2 border-slate-200 pl-3">
                          <p className="text-xs font-bold">{event.status.replaceAll("_", " ")}</p>
                          <p className="mt-1 text-sm text-slate-600">{event.description || event.type}</p>
                          <p className="mt-1 text-xs text-slate-400">{dateLabel(event.createdAt)} · Actor {event.actorId}</p>
                        </li>
                      ))}
                    </ol>
                  ) : <p className="mt-2 text-sm text-slate-500">No verification events returned.</p>}
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t bg-slate-50 p-5">
                  {item.status === "ADMIN_REVIEW" ? (
                    <>
                      <button
                        disabled={!!busyId}
                        onClick={() => void transition(item, "ADMIN_REJECTED")}
                        className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"
                      >
                        {isBusy ? "Saving…" : "Reject"}
                      </button>
                      <button
                        disabled={!!busyId}
                        onClick={() => void transition(item, "ADMIN_APPROVED")}
                        className="rounded-xl bg-[#FACC15] px-5 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50"
                      >
                        {isBusy ? "Saving…" : "Approve for blockchain"}
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={!!busyId}
                      onClick={() => void transition(item, "ADMIN_REVIEW")}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold disabled:opacity-50"
                    >
                      {isBusy ? "Saving…" : "Reopen review"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Administrator approval only advances the record to the blockchain-pending stage. It does not itself create or verify an on-chain transaction or issue a certificate.
        </p>
      </div>
    </main>
  );
}
