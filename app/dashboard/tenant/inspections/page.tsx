"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import PaginationControls from "@/components/PaginationControls";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";

type Inspection = {
  id: string;
  scheduledAt: string;
  createdAt?: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "MISSED";
  tenantDecision?: "REJECTED" | null;
  applicationStatus?: string | null;
  remarks: string | null;
  property: {
    id: string;
    title: string;
    address: { addressLine1: string } | null;
    media: {
      url: string;
      thumbnailUrl: string | null;
    }[];
  };
  inspector: {
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
  } | null;
};

type InspectionsResponse = { success: boolean; data: Inspection[] };

const statusTone: Record<Inspection["status"], "success" | "pending" | "danger"> = {
  PENDING: "pending",
  CONFIRMED: "pending",
  COMPLETED: "success",
  CANCELLED: "danger",
  MISSED: "danger",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyInspectionsPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [tab, setTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [contactInspectionId, setContactInspectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [rejectedInspectionIds, setRejectedInspectionIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const load = async () => {
      try {
        const res = await apiFetch<InspectionsResponse>(
          "/api/v1/inspections/me",
          getToken,
        );
        setInspections(res.data);
        setRejectedInspectionIds(
          res.data
            .filter((inspection) => inspection.tenantDecision === "REJECTED")
            .map((inspection) => inspection.id),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load your inspections",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLoaded, isSignedIn, getToken, router]);

  const filtered = inspections
    .filter((inspection) => {
      if (tab === "cancelled") return inspection.status === "CANCELLED" || inspection.status === "MISSED";
      if (tab === "past") return inspection.status === "COMPLETED";
      return inspection.status === "PENDING" || inspection.status === "CONFIRMED";
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt ?? a.scheduledAt).getTime();
      const dateB = new Date(b.createdAt ?? b.scheduledAt).getTime();
      return dateB - dateA;
    });

  const visibleInspections = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <TopAppBar title="My Inspections" />

      <div className="mx-auto max-w-lg px-4 py-4">
        <div className="flex gap-2">
          {(["upcoming", "past", "cancelled"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setPage(1);
                setTab(value);
                setSelectedInspectionId(null);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize ${
                tab === value
                  ? "border-brand-yellow bg-brand-yellow/20 text-black"
                  : "border-black/10 bg-white text-black/60"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-black/40">Loading...</p>
          ) : error ? (
            <p className="text-sm text-status-danger-fg">{error}</p>
          ) : filtered.length === 0 ? (
            <Card className="flex flex-col items-center gap-1 p-8 text-center">
              <p className="font-semibold">No {tab} inspections</p>
              <p className="text-sm text-black/50">
                Book an inspection from any property&apos;s details page.
              </p>
            </Card>
          ) : (
            visibleInspections.map((inspection) => {
              const media = inspection.property.media[0];
              const imageUrl = media
                ? resolveMediaUrl(media.thumbnailUrl ?? media.url)
                : null;
              const selected = selectedInspectionId === inspection.id;

              return (
                <Card key={inspection.id} className="overflow-hidden">
                  <button
                    type="button"
                    className="block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-yellow"
                    aria-label={`Select inspection for ${inspection.property.title}`}
                    aria-expanded={selected}
                    onClick={() => setSelectedInspectionId(selected ? null : inspection.id)}
                  >
                  {imageUrl && (
                    <div className="relative h-40 w-full overflow-hidden bg-black/5">
                      <img
                        src={imageUrl}
                        alt={inspection.property.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {inspection.property.title}
                        </p>
                        {inspection.property.address && (
                          <p className="text-xs text-black/50">
                            {inspection.property.address.addressLine1}
                          </p>
                        )}
                      </div>

                      <StatusPill tone={statusTone[inspection.status]}>
                        {inspection.status}
                      </StatusPill>
                    </div>

                    <p className="mt-2 text-xs text-black/40">
                      {formatDateTime(inspection.scheduledAt)}
                    </p>

                    {inspection.inspector && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-xs text-black/50">
                          Assigned agent:{" "}
                          {[inspection.inspector.firstName, inspection.inspector.lastName]
                            .filter(Boolean)
                            .join(" ") || "Agent"}
                        </p>
                        {inspection.inspector.phoneNumber ? (
                          <a
                            href={`tel:${inspection.inspector.phoneNumber}`}
                            onClick={(event) => event.stopPropagation()}
                            className="text-xs font-semibold text-black underline underline-offset-2"
                          >
                            {inspection.inspector.phoneNumber}
                          </a>
                        ) : (
                          <span className="text-xs text-black/40">
                            Phone number unavailable
                          </span>
                        )}
                      </div>
                    )}

                    {inspection.remarks && (
                      <p className="mt-2 text-sm text-black/70">
                        <span className="font-semibold">Report: </span>
                        {inspection.remarks}
                      </p>
                    )}
                      <p className="mt-3 text-xs font-semibold text-black/50">
                        {selected ? "Booking selected · choose an action below" : "Select booking to view actions"}
                      </p>
                    </div>
                  </button>

                  {selected && (
                    <div className="border-t border-black/10 bg-black/[0.02] p-4">
                      <p className="mb-3 text-sm text-black/60">
                        Continue with this property or return to search.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        {inspection.applicationStatus &&
                        [
                          "APPLICATION_SUBMITTED",
                          "OWNER_REVIEW",
                          "OWNER_APPROVED",
                          "ACTIVATION_PENDING",
                          "ACTIVATED",
                          "TENANCY_ACTIVE",
                        ].includes(inspection.applicationStatus) ? (
                          <div className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
                            <span aria-hidden="true" className="text-lg">✓</span>
                            Accepted
                          </div>
                        ) : inspection.status !== "CANCELLED" &&
                        inspection.status !== "MISSED" ? (
                          <button
                            type="button"
                            onClick={async () => {
                            if (actionBusyId || rejectedInspectionIds.includes(inspection.id)) return;
                            setError("");
                            setActionBusyId(inspection.id);
                            try {
                              await apiFetch(
                                `/api/v1/inspections/${encodeURIComponent(inspection.id)}/accept-and-apply`,
                                getToken,
                                { method: "POST" },
                              );
                              const params = new URLSearchParams({
                                propertyId: inspection.property.id,
                                inspectionId: inspection.id,
                                propertyTitle: inspection.property.title,
                                scheduledAt: inspection.scheduledAt,
                                inspectionStatus: inspection.status,
                                applicationSubmitted: "true",
                              });
                              router.push(`/dashboard/tenant/applications?${params.toString()}`);
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Unable to submit your application.");
                            } finally {
                              setActionBusyId(null);
                            }
                          }}
                            disabled={actionBusyId === inspection.id || rejectedInspectionIds.includes(inspection.id)}
                          className="min-h-11 flex-1 rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:opacity-50"
                          >
                            Accept & Apply
                          </button>
                        ) : (
                          <div className="flex-1 rounded-xl bg-black/5 px-4 py-3 text-center text-xs text-black/60">
                            {inspection.status === "CANCELLED" || inspection.status === "MISSED"
                              ? "This booking is no longer active."
                              : "This booking is no longer active."}
                          </div>
                        )}
                        {rejectedInspectionIds.includes(inspection.id) ? (
                          <div className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-black/5 px-4 py-2.5 text-sm font-semibold text-black/60">
                            Declined
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={actionBusyId === inspection.id}
                            onClick={async () => {
                              if (actionBusyId) return;
                              setError("");
                              setActionBusyId(inspection.id);
                              try {
                                await apiFetch(
                                  `/api/v1/inspections/${encodeURIComponent(inspection.id)}/reject`,
                                  getToken,
                                  { method: "POST" },
                                );
                                setRejectedInspectionIds((current) =>
                                  current.includes(inspection.id) ? current : [...current, inspection.id]
                                );
                              } catch (err) {
                                setError(err instanceof Error ? err.message : "Unable to record your decision.");
                              } finally {
                                setActionBusyId(null);
                              }
                            }}
                            className="min-h-11 flex-1 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold text-black/70 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:opacity-50"
                          >
                            {actionBusyId === inspection.id ? "Please wait…" : "Reject"}
                          </button>
                        )}
                        {inspection.inspector && (
                          <div className="flex min-h-11 flex-1 flex-col justify-center gap-1 rounded-xl border border-black/10 bg-white px-3 py-2">
                            <span className="text-xs font-medium text-black/55">
                              Assigned agent
                            </span>
                            <span className="text-sm font-semibold text-black">
                              {[inspection.inspector.firstName, inspection.inspector.lastName]
                                .filter(Boolean)
                                .join(" ") || "Property agent"}
                            </span>
                            {inspection.inspector.phoneNumber ? (
                              <a
                                href={`tel:${inspection.inspector.phoneNumber}`}
                                className="text-sm font-semibold text-blue-700 underline underline-offset-2"
                              >
                                {inspection.inspector.phoneNumber} · Call Agent
                              </a>
                            ) : (
                              <span className="text-xs text-black/55">
                                No phone number available
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setContactInspectionId((current) =>
                                  current === inspection.id ? null : inspection.id
                                )
                              }
                              className="self-start text-xs font-medium text-black/60 underline underline-offset-2"
                            >
                              More contact options
                            </button>
                          </div>
                        )}
                      </div>

                      {contactInspectionId === inspection.id && inspection.inspector && (
                        <div
                          className="mt-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
                          role="dialog"
                          aria-label="Contact assigned agent"
                          aria-modal="false"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-semibold text-black">
                                Contact your agent
                              </h3>
                              <p className="mt-1 text-sm text-black/60">
                                {[inspection.inspector.firstName, inspection.inspector.lastName]
                                  .filter(Boolean)
                                  .join(" ") || "Assigned agent"}
                              </p>
                              <p className="mt-1 text-sm text-black/70">
                                {inspection.inspector.phoneNumber || "No phone number is available for this agent."}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setContactInspectionId(null)}
                              className="rounded-lg px-3 py-1.5 text-sm font-medium text-black/60 hover:bg-black/5"
                              aria-label="Close contact popup"
                            >
                              Close
                            </button>
                          </div>

                          {inspection.inspector.phoneNumber && (
                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                              <a
                                href={`tel:${inspection.inspector.phoneNumber}`}
                                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-black/15 px-4 py-2 text-sm font-semibold text-black hover:bg-black/5"
                              >
                                Call Agent
                              </a>
                              <a
                                href={`https://wa.me/${(() => {
                                  const digits = inspection.inspector!.phoneNumber!.replace(/\D/g, "");
                                  return digits.startsWith("0")
                                    ? `234${digits.slice(1)}`
                                    : digits;
                                })()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-brand-yellow px-4 py-2 text-sm font-semibold text-black hover:brightness-95"
                              >
                                Chat on WhatsApp
                              </a>
                            </div>
                          )}

                          <p className="mt-3 text-xs leading-5 text-black/45">
                            WhatsApp opens an external conversation. Messages are not sent inside this page.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
          {!loading && !error && filtered.length > 0 && (
            <PaginationControls page={page} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} />
          )}
        </div>

      </div>
    </>
  );
}
