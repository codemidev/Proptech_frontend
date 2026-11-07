"use client";

import { useCallback, useEffect, useState } from "react";
import PaginationControls from "@/components/PaginationControls";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";

type OwnerApplication = {
  id: string;
  status: string;
  createdAt?: string;
  tenant: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phoneNumber: string | null;
    avatar: string | null;
    isVerified: boolean;
    status: string;
  } | null;
  agent: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phoneNumber: string | null;
    avatar: string | null;
  } | null;
  property: {
    id: string;
    title: string;
    agent: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      phoneNumber: string | null;
      avatar: string | null;
    } | null;
  };
  inspection: {
    id: string;
    scheduledAt: string;
    status: string;
  } | null;
  rentEvidence: {
    id: string;
    amount: string | number;
    currency: string;
    status: string;
    paymentMethod: string | null;
    externalReference: string | null;
    evidenceUrl: string | null;
    note: string | null;
    reportedAt: string;
  }[];
  tenancy: {
    id: string;
    status: string;
    leaseNumber: string | null;
    contractGeneratedAt: string | null;
    tenantConsentedAt: string | null;
    tenantConsentName: string | null;
  } | null;
  payments: {
    id: string;
    purpose: string;
    status: string;
    amount: string | number;
    currency: string;
    reference: string | null;
    checkoutUrl: string | null;
  }[];
};

type ApplicationsResponse = {
  success: boolean;
  data: OwnerApplication[];
  contractGenerationFee?: number;
  message?: string;
};

type ActionResponse = {
  success: boolean;
  message?: string;
};

function formatStatus(value?: string | null) {
  if (!value) return "Unavailable";
  return value.replaceAll("_", " ").toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatEvidenceStatus(value?: string | null, hasConfirmedEvidence = false) {
  if (hasConfirmedEvidence && value === "REPORTED") {
    return "Superseded — payment confirmed";
  }

  switch (value) {
    case "OWNER_CONFIRMED":
      return "Payment Confirmed";
    case "REPORTED":
      return "Awaiting Payment Review";
    case "DISPUTED":
      return "Payment Proof Declined";
    case "NOT_REPORTED":
      return "No Payment Reported";
    default:
      return formatStatus(value);
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tenantName(tenant: OwnerApplication["tenant"]) {
  if (!tenant) return "Tenant profile unavailable";
  const name = [tenant.firstName, tenant.lastName].filter(Boolean).join(" ").trim();
  return name || tenant.email || "Name not provided";
}

function safeEvidenceUrl(value?: string | null) {
  if (!value) return null;
  if (value.startsWith("/uploads/") || value.startsWith("/api/v1/uploads/")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? value : null;
  } catch {
    return null;
  }
}

export default function OwnerTenantApplicationsPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<OwnerApplication[]>([]);
  const [contractGenerationFee, setContractGenerationFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [busyId, setBusyId] = useState("");
  const [leaseDialogApplication, setLeaseDialogApplication] = useState<OwnerApplication | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const orderedApplications = [...applications].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
  const visibleApplications = orderedApplications.slice((page - 1) * pageSize, page * pageSize);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<ApplicationsResponse>(
        "/api/v1/inspections/owner/applications",
        getToken,
      );
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error(response.message || "Unexpected applications response.");
      }
      setApplications(response.data);
      setContractGenerationFee(
        Number.isSafeInteger(response.contractGenerationFee) && response.contractGenerationFee! >= 0
          ? response.contractGenerationFee!
          : null,
      );
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tenant applications.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Loads owner applications after auth state resolves.
    void loadApplications();
  }, [isLoaded, isSignedIn, router, loadApplications]);

  async function reviewApplication(id: string, decision: "approve" | "decline") {
    const verb = decision === "approve" ? "approve" : "decline";
    if (decision === "decline" && !window.confirm("Decline this tenant application?")) {
      return;
    }

    setBusyId(id);
    setActionError("");
    setActionSuccess("");
    try {
      const response = await apiFetch<ActionResponse>(
        `/api/v1/inspections/owner/applications/${encodeURIComponent(id)}/${decision}`,
        getToken,
        { method: "POST" },
      );
      if (!response.success) {
        throw new Error(response.message || `Unable to ${verb} this application.`);
      }
      setApplications((current) => current.filter((item) => item.id !== id));
      setPage((currentPage) => Math.min(currentPage, Math.max(1, Math.ceil((applications.length - 1) / pageSize))));
      setActionSuccess(
        decision === "approve"
          ? "Application approved successfully."
          : "Application declined successfully."
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Unable to ${verb} this application.`);
    } finally {
      setBusyId("");
    }
  }


  async function recoverApprovedLease(application: OwnerApplication, formData: FormData) {
    const optionalAmount = (name: string) => {
      const raw = String(formData.get(name) ?? "").trim();
      return raw === "" ? undefined : Number(raw);
    };

    setBusyId(application.id);
    setActionError("");
    setActionSuccess("");

    try {
      const response = await apiFetch<ActionResponse>(
        "/api/v1/leases/recover-approved-application",
        getToken,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyTransactionId: application.id,
            startDate: formData.get("startDate"),
            endDate: formData.get("endDate"),
            rentFrequency: formData.get("rentFrequency"),
            rentAmount: Number(formData.get("rentAmount")),
            securityDeposit: optionalAmount("securityDeposit"),
            serviceCharge: optionalAmount("serviceCharge"),
            cautionFee: optionalAmount("cautionFee"),
          }),
        },
      );

      if (!response.success) {
        throw new Error(response.message || "Unable to recover the draft lease.");
      }

      await loadApplications();
      setActionSuccess(
        "Draft lease linked successfully. Confirmed-rent and contract-payment requirements remain in effect.",
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to recover the draft lease.");
    } finally {
      setBusyId("");
    }
  }

  async function reviewPaymentEvidence(
    evidenceId: string,
    decision: "approve" | "decline",
  ) {
    let reason: string | undefined;

    if (decision === "decline") {
      const entered = window.prompt("Why are you declining this payment proof?");
      if (entered === null) return;
      reason = entered.trim();
      if (!reason) {
        setActionError("A reason is required to decline payment proof.");
        return;
      }
      if (reason.length > 1000) {
        setActionError("The decline reason must be 1000 characters or fewer.");
        return;
      }
    }

    setBusyId(evidenceId);
    setActionError("");
    setActionSuccess("");

    try {
      const response = await apiFetch<ActionResponse>(
        `/api/v1/inspections/owner/payment-evidence/${encodeURIComponent(evidenceId)}/${decision}`,
        getToken,
        {
          method: "POST",
          ...(reason ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
          } : {}),
        },
      );

      if (!response.success) {
        throw new Error(response.message || "Unable to review payment proof.");
      }

      await loadApplications();

      setActionSuccess(
        decision === "approve"
          ? "Payment proof confirmed. Continue to contract generation."
          : "Payment proof declined. The application remains available for corrected evidence."
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Unable to review payment proof."
      );
    } finally {
      setBusyId("");
    }
  }


  async function startContractPayment(application: OwnerApplication) {
    if (!application.tenancy?.id) {
      setActionError("The lease record is unavailable. Refresh and try again.");
      return;
    }

    const applicationStatus = application.status.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (!["OWNER_APPROVED", "ACTIVATION_PENDING"].includes(applicationStatus)) {
      setActionError("The owner must approve this application before contract generation.");
      return;
    }

    const confirmed = application.rentEvidence.some(
      (evidence) => evidence.status === "OWNER_CONFIRMED"
    );
    if (!confirmed) {
      setActionError("Confirm the tenant's rent payment before generating a contract.");
      return;
    }

    setBusyId(application.id);
    setActionError("");
    setActionSuccess("");

    try {
      const response = await apiFetch<{
        success: boolean;
        message?: string;
        data?: {
          status?: string;
          checkoutUrl?: string | null;
          paymentLink?: string | null;
        };
      }>(
        "/api/v1/payments/lease-contract/initialize",
        getToken,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyTransactionId: application.id }),
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || "Unable to initialize contract payment.");
      }

      if (response.data.status?.toUpperCase() === "SUCCESS") {
        const generated = await apiFetch<ActionResponse>(
          `/api/v1/leases/${encodeURIComponent(application.tenancy.id)}/contract/generate`,
          getToken,
          { method: "POST" },
        );
        if (!generated.success) {
          throw new Error(generated.message || "Payment is successful, but contract generation failed.");
        }
        setActionSuccess("Contract generated. It is now available for tenant consent.");
        setLeaseDialogApplication(null);
        await loadApplications();
        return;
      }

      const checkoutUrl = response.data.checkoutUrl || response.data.paymentLink;
      if (!checkoutUrl) {
        throw new Error("Payment initialized without a checkout URL. Refresh and retry.");
      }

      window.location.assign(checkoutUrl);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to process contract payment.");
    } finally {
      setBusyId("");
    }
  }

  async function generatePaidContract(application: OwnerApplication) {
    if (!application.tenancy?.id) {
      setActionError("The lease record is unavailable. Refresh and try again.");
      return;
    }

    const applicationStatus = application.status.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (!["OWNER_APPROVED", "ACTIVATION_PENDING"].includes(applicationStatus)) {
      setActionError("Owner approval is required before generating the lease.");
      return;
    }

    if (!application.rentEvidence.some((evidence) => evidence.status === "OWNER_CONFIRMED")) {
      setActionError("The rent payment must be confirmed before generating the lease.");
      return;
    }

    setBusyId(application.id);
    setActionError("");
    setActionSuccess("");

    try {
      const response = await apiFetch<ActionResponse>(
        `/api/v1/leases/${encodeURIComponent(application.tenancy.id)}/contract/generate`,
        getToken,
        { method: "POST" },
      );

      if (!response.success) {
        throw new Error(response.message || "Unable to generate contract.");
      }

      setActionSuccess("Contract generated. It is now available for tenant consent.");
      setLeaseDialogApplication(null);
      await loadApplications();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to generate contract.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <TopAppBar title="Tenant Applications" />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
            Owner workspace
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            Tenant Applications
          </h1>
          <p className="text-sm leading-6 text-black/55">
            Review applications, record owner decisions, and set up leases for approved tenants.
          </p>
        </header>

        {actionSuccess && (
          <Card className="border border-emerald-200 bg-emerald-50 p-4">
            <p role="status" className="text-sm font-medium text-emerald-800">
              {actionSuccess}
            </p>
          </Card>
        )}

        {actionError && (
          <Card className="border border-red-200 bg-red-50 p-4">
            <p role="alert" className="text-sm text-red-700">{actionError}</p>
          </Card>
        )}

        {loading ? (
          <Card className="p-5">
            <p className="animate-pulse text-sm text-black/55">Loading tenant applications…</p>
          </Card>
        ) : error ? (
          <Card className="space-y-3 p-5">
            <p role="alert" className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadApplications()}
              className="min-h-10 rounded-xl border border-black/15 px-4 text-sm font-semibold"
            >
              Try again
            </button>
          </Card>
        ) : applications.length === 0 ? (
          <Card className="space-y-2 p-6 text-center">
            <h2 className="text-lg font-semibold text-black">No active tenant applications</h2>
            <p className="text-sm leading-6 text-black/55">
              Applications awaiting your review and approved applications eligible for lease setup will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleApplications.map((application) => {
              const tenant = application.tenant;
              const displayName = tenantName(tenant);
              const isBusy = busyId === application.id;
              const hasConfirmedEvidence = application.rentEvidence.some(
                (evidence) => evidence.status === "OWNER_CONFIRMED"
              );

              return (
                <Card key={application.id} className="space-y-5 border border-black/10 p-5 shadow-sm sm:p-6">
                  <div className="flex items-start gap-3">
                    {tenant?.avatar ? (
                      // Avatar is supplied by the existing application-user profile.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tenant.avatar}
                        alt=""
                        className="h-12 w-12 rounded-full bg-black/5 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/5 text-lg font-semibold text-black/60">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-black">{displayName}</h2>
                      <p className="break-all text-sm text-black/60">{tenant?.email || "Email unavailable"}</p>
                      <p className="mt-1 text-sm text-black/60">{tenant?.phoneNumber || "Phone not provided"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      tenant?.isVerified
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-amber-50 text-amber-900"
                    }`}>
                      {tenant?.isVerified ? "Verified" : "Not verified"}
                    </span>
                  </div>

                  <div className="rounded-xl bg-black/[0.035] p-3">
                    <p className="text-xs text-black/45">Property</p>
                    <p className="mt-1 font-semibold text-black">{application.property.title}</p>
                    <p className="mt-2 text-xs text-black/45">Assigned agent</p>
                    <p className="mt-1 text-sm font-medium text-black">
                      {(() => {
                        const agent = application.agent ?? application.property.agent;
                        return agent
                          ? [agent.firstName, agent.lastName].filter(Boolean).join(" ") || agent.email
                          : "Agent not assigned";
                      })()}
                    </p>
                    {(() => {
                      const agent = application.agent ?? application.property.agent;
                      return agent?.email ? (
                        <p className="mt-1 break-all text-sm text-black/60">{agent.email}</p>
                      ) : null;
                    })()}
                    {(() => {
                      const agent = application.agent ?? application.property.agent;
                      return agent?.phoneNumber ? (
                        <p className="mt-1 text-sm text-black/60">{agent.phoneNumber}</p>
                      ) : null;
                    })()}
                    <p className="mt-2 text-xs text-black/45">Application status</p>
                    <p className="mt-1 text-sm font-medium text-black">{formatStatus(application.status)}</p>
                    <p className="mt-2 text-xs text-black/45">Inspection</p>
                    <p className="mt-1 text-sm text-black/70">
                      {application.inspection
                        ? `${formatDate(application.inspection.scheduledAt)} · ${formatStatus(application.inspection.status)}`
                        : "No linked inspection"}
                    </p>
                  </div>

                  <section className="space-y-3 rounded-xl border border-black/10 p-4">
                    <div>
                      <h3 className="font-semibold text-black">Payment proof</h3>
                      <p className="mt-1 text-sm text-black/55">
                        Evidence submitted for this tenant application.
                      </p>
                    </div>
                    {!application.rentEvidence?.length ? (
                      <p className="text-sm text-black/55">No payment proof submitted for this application.</p>
                    ) : (
                      <div className="space-y-3">
                        {application.rentEvidence.map((evidence) => {
                          const evidenceLink = safeEvidenceUrl(evidence.evidenceUrl);
                          return (
                            <div key={evidence.id} className="rounded-lg bg-black/[0.035] p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold text-black">
                                  {evidence.currency} {Number(evidence.amount).toLocaleString()}
                                </p>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  evidence.status === "OWNER_CONFIRMED" || hasConfirmedEvidence
                                    ? "bg-emerald-50 text-emerald-800"
                                    : evidence.status === "DISPUTED"
                                      ? "bg-red-50 text-red-700"
                                      : "bg-amber-50 text-amber-900"
                                }`}>
                                  {formatEvidenceStatus(evidence.status, hasConfirmedEvidence)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-black/50">
                                Submitted {formatDate(evidence.reportedAt)}
                              </p>
                              {evidence.paymentMethod && (
                                <p className="mt-2 text-sm text-black/70">
                                  Method: {evidence.paymentMethod}
                                </p>
                              )}
                              {evidence.externalReference && (
                                <p className="mt-1 break-all text-sm text-black/70">
                                  Reference: {evidence.externalReference}
                                </p>
                              )}
                              {evidence.note && (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-black/70">
                                  {evidence.note}
                                </p>
                              )}
                              {evidenceLink ? (
                                <a
                                  href={evidenceLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-black/5"
                                >
                                  View payment proof
                                </a>
                              ) : (
                                <p className="mt-2 text-sm text-black/50">
                                  No viewable proof file attached.
                                </p>
                              )}

                              {evidence.status === "REPORTED" && !hasConfirmedEvidence && (
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  <button
                                    type="button"
                                    disabled={Boolean(busyId)}
                                    onClick={() => void reviewPaymentEvidence(evidence.id, "approve")}
                                    className="min-h-10 rounded-lg bg-brand-yellow px-3 py-2 text-sm font-semibold text-black hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {busyId === evidence.id ? "Processing…" : "Approve payment proof"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={Boolean(busyId)}
                                    onClick={() => void reviewPaymentEvidence(evidence.id, "decline")}
                                    className="min-h-10 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {busyId === evidence.id ? "Processing…" : "Decline payment proof"}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section className="space-y-3 rounded-xl border border-black/10 p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-black">Lease contract</h3>
                      <p className="mt-1 text-sm text-black/55">
                        {contractGenerationFee === null
                          ? "The configured contract-generation fee is currently unavailable."
                          : `Contract generation costs ₦${contractGenerationFee.toLocaleString("en-NG")} after rent payment is confirmed.`}
                        Tenancy activates only after the tenant provides consent.
                      </p>
                    </div>

                    {!application.tenancy ? (
                      application.status.trim().toUpperCase().replace(/[\\s-]+/g, "_") === "OWNER_APPROVED" ? (
                        <form
                          className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void recoverApprovedLease(
                              application,
                              new FormData(event.currentTarget),
                            );
                          }}
                        >
                          <p className="text-sm text-black/70">
                            This approved application has no linked lease. Enter the actual agreed lease terms. A payment-proof amount is not automatically the rent amount.
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="text-sm font-medium text-black/80">
                              Lease start date
                              <input name="startDate" type="date" required className="mt-1 min-h-10 w-full rounded-lg border border-black/15 bg-white px-3" />
                            </label>
                            <label className="text-sm font-medium text-black/80">
                              Lease end date
                              <input name="endDate" type="date" required className="mt-1 min-h-10 w-full rounded-lg border border-black/15 bg-white px-3" />
                            </label>
                            <label className="text-sm font-medium text-black/80">
                              Rent frequency
                              <select name="rentFrequency" required defaultValue="ANNUALLY" className="mt-1 min-h-10 w-full rounded-lg border border-black/15 bg-white px-3">
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="QUARTERLY">Quarterly</option>
                                <option value="SEMI_ANNUALLY">Semi-annually</option>
                                <option value="ANNUALLY">Annually</option>
                              </select>
                            </label>
                            <label className="text-sm font-medium text-black/80">
                              Agreed rent amount (₦)
                              <input name="rentAmount" type="number" min="0.01" step="0.01" required className="mt-1 min-h-10 w-full rounded-lg border border-black/15 bg-white px-3" />
                            </label>
                            <label className="text-sm font-medium text-black/80">
                              Security deposit (₦, optional)
                              <input name="securityDeposit" type="number" min="0" step="0.01" className="mt-1 min-h-10 w-full rounded-lg border border-black/15 bg-white px-3" />
                            </label>
                            <label className="text-sm font-medium text-black/80">
                              Service charge (₦, optional)
                              <input name="serviceCharge" type="number" min="0" step="0.01" className="mt-1 min-h-10 w-full rounded-lg border border-black/15 bg-white px-3" />
                            </label>
                            <label className="text-sm font-medium text-black/80 sm:col-span-2">
                              Caution fee (₦, optional)
                              <input name="cautionFee" type="number" min="0" step="0.01" className="mt-1 min-h-10 w-full rounded-lg border border-black/15 bg-white px-3" />
                            </label>
                          </div>
                          <button
                            type="submit"
                            disabled={Boolean(busyId)}
                            className="min-h-11 rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-black hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isBusy ? "Creating draft lease…" : "Create draft lease"}
                          </button>
                        </form>
                      ) : (
                        <p className="text-sm text-black/55">
                          Lease record is unavailable. Recovery is limited to owner-approved applications.
                        </p>
                      )
                    ) : application.tenancy.contractGeneratedAt ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-emerald-800">
                          Contract generated · {formatDate(application.tenancy.contractGeneratedAt)}
                        </p>
                        <p className="text-sm text-black/60">
                          {application.tenancy.tenantConsentedAt
                            ? `Tenant consent recorded: ${application.tenancy.tenantConsentName || "Legal name recorded"}`
                            : "Awaiting tenant review and explicit consent."}
                        </p>
                      </div>
                    ) : !["OWNER_APPROVED", "ACTIVATION_PENDING"].includes(
                      application.status.trim().toUpperCase().replace(/[\s-]+/g, "_")
                    ) ? (
                      <p className="text-sm text-amber-800">
                        Lease generation becomes available after the owner approves this application.
                      </p>
                    ) : !hasConfirmedEvidence ? (
                      <p className="text-sm text-amber-800">
                        Confirm the tenant's rent payment above before proceeding.
                      </p>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(busyId)}
                        onClick={() => setLeaseDialogApplication(application)}
                        className="min-h-11 rounded-xl bg-[#FACC15] px-4 py-2.5 text-sm font-bold text-[#111315] shadow-sm transition hover:bg-[#EAB308] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Review lease generation
                      </button>
                    )}
                  </section>

                  {![
                    "OWNER_APPROVED",
                    "ACTIVATION_PENDING",
                    "ACTIVATED",
                    "TENANCY_ACTIVE",
                    "ACTIVE",
                    "APPROVED",
                    "DECLINED",
                    "REJECTED",
                    "CANCELLED",
                    "EXPIRED",
                  ].includes(
                    application.status.trim().toUpperCase().replace(/[\s-]+/g, "_")
                  ) && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={Boolean(busyId) || !tenant}
                        onClick={() => void reviewApplication(application.id, "approve")}
                        className="min-h-11 rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-black hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isBusy ? "Processing…" : "Approve application"}
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(busyId)}
                        onClick={() => void reviewApplication(application.id, "decline")}
                        className="min-h-11 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isBusy ? "Processing…" : "Decline application"}
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
            <PaginationControls page={page} totalItems={applications.length} pageSize={pageSize} onPageChange={setPage} />
          </div>
        )}

        <Link
          href="/dashboard/owner"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-black/15 px-4 py-2.5 text-sm font-semibold text-black/70 hover:bg-black/5"
        >
          Back to owner dashboard
        </Link>
      </main>

      <Dialog
        open={Boolean(leaseDialogApplication)}
        onOpenChange={(open) => {
          if (!open && !busyId) setLeaseDialogApplication(null);
        }}
        title="Generate lease contract"
        description="Review the requirements before generating this tenant's lease."
        size="lg"
        className="border border-neutral-200"
        closeOnOverlayClick={!busyId}
        closeOnEscape={!busyId}
      >
        {leaseDialogApplication && (
          <div className="space-y-5">
            <div className="rounded-xl bg-[#111315] p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
                Aviritech PropTech
              </p>
              <h3 className="mt-2 text-lg font-bold">
                {leaseDialogApplication.property.title}
              </h3>
              <p className="mt-1 text-sm text-white/70">
                Tenant: {leaseDialogApplication.tenant
                  ? [leaseDialogApplication.tenant.firstName, leaseDialogApplication.tenant.lastName]
                      .filter(Boolean).join(" ") || leaseDialogApplication.tenant.email
                  : "Tenant"}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 p-3">
                <p className="text-xs text-neutral-500">Application approval</p>
                <p className="mt-1 text-sm font-bold text-emerald-700">Owner approved</p>
              </div>
              <div className="rounded-xl border border-neutral-200 p-3">
                <p className="text-xs text-neutral-500">Rent payment evidence</p>
                <p className="mt-1 text-sm font-bold text-emerald-700">Owner confirmed</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#FACC15] bg-[#FACC15]/15 p-4">
              <p className="text-sm font-semibold text-[#111315]">
                Contract generation fee
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[#111315]">
                {contractGenerationFee === null
                  ? "Unavailable"
                  : `₦${contractGenerationFee.toLocaleString("en-NG")}`}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                {contractGenerationFee === 0
                  ? "The configured contract fee is waived."
                  : leaseDialogApplication.payments.some(
                      (payment) =>
                        payment.purpose === "LEASE_CONTRACT_GENERATION" &&
                        payment.status.trim().toUpperCase() === "SUCCESS"
                    )
                    ? "Verified contract-generation payment found."
                    : "The fee must be paid and verified before the contract can be generated."}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => setLeaseDialogApplication(null)}
                className="min-h-11 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(busyId) || contractGenerationFee === null}
                onClick={() => {
                  const feePaid = leaseDialogApplication.payments.some(
                    (payment) =>
                      payment.purpose === "LEASE_CONTRACT_GENERATION" &&
                      payment.status.trim().toUpperCase() === "SUCCESS"
                  );

                  if (feePaid) {
                    void generatePaidContract(leaseDialogApplication);
                  } else {
                    void startContractPayment(leaseDialogApplication);
                  }
                }}
                className="min-h-11 rounded-xl bg-[#FACC15] px-5 py-2.5 text-sm font-extrabold text-[#111315] shadow-sm transition hover:bg-[#EAB308] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyId === leaseDialogApplication.id
                  ? "Processing…"
                  : leaseDialogApplication.payments.some(
                      (payment) =>
                        payment.purpose === "LEASE_CONTRACT_GENERATION" &&
                        payment.status.trim().toUpperCase() === "SUCCESS"
                    )
                    ? "Generate lease"
                    : contractGenerationFee === null
                      ? "Check fee settings"
                      : contractGenerationFee === 0
                        ? "Generate lease"
                        : `Pay ₦${contractGenerationFee.toLocaleString("en-NG")} & continue`}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
