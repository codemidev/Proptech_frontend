"use client";

import { useEffect, useState, type FormEvent } from "react";
import PaginationControls from "@/components/PaginationControls";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { Card } from "@/components/ui/Card";

type ApplicationInspection = {
  id: string;
  scheduledAt: string;
  status: string;
  applicationStatus?: string | null;
  applicationCreatedAt?: string | null;
  createdAt?: string | null;
  propertyTransactionId?: string | null;
  tenancyId?: string | null;
  tenancy?: {
    id: string;
    leaseNumber: string | null;
    status: string;
    startDate?: string;
    endDate?: string;
    rentFrequency?: string;
    rentAmount?: number | string;
    securityDeposit?: number | string | null;
    serviceCharge?: number | string | null;
    cautionFee?: number | string | null;
    agreementUrl?: string | null;
    notes?: string | null;
    contractText?: string | null;
    contractGeneratedAt?: string | null;
    tenantConsentedAt?: string | null;
    tenantConsentName?: string | null;
  } | null;
  contractGenerationPayment?: PaymentRecord | null;
  tenantDecision?: "REJECTED" | null;
  assignedAgent?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phoneNumber: string | null;
    avatar: string | null;
  } | null;
  booking?: {
    payment?: PaymentRecord | null;
  } | null;
  applicationPayments?: PaymentRecord[];
  paymentEvidence?: PaymentEvidence[];
  ownerPaymentDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  } | null;
  property: {
    id: string;
    title: string;
    address: { addressLine1: string } | null;
    media: { url: string; thumbnailUrl: string | null }[];
  };
};

type PaymentRecord = {
  id: string;
  reference: string;
  purpose: string;
  status: string;
  amount: number | string;
  currency: string;
  createdAt?: string;
  flutterwave?: { verified: boolean; verifiedAt: string | null } | null;
};

type PaymentEvidence = {
  id: string;
  amount: number | string;
  currency: string;
  status: string;
  paymentMethod: string | null;
  externalReference: string | null;
  evidenceUrl: string | null;
  note: string | null;
  reportedAt: string;
  confirmedAt: string | null;
};

type InspectionResponse = {
  success: boolean;
  data: ApplicationInspection[];
};

const submittedStatuses = new Set([
  "APPLICATION_SUBMITTED",
  "OWNER_REVIEW",
  "OWNER_APPROVED",
  "ACTIVATION_PENDING",
  "ACTIVATED",
  "TENANCY_ACTIVE",
  "CANCELLED",
  "EXPIRED",
]);

function formatDateTime(value: string) {
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

function formatStatus(status?: string | null) {
  if (!status) return "Status unavailable";
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMoney(amount: number | string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${currency} ${amount}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency || "NGN"} ${value.toLocaleString()}`;
  }
}

function paymentVerified(payment: PaymentRecord) {
  return payment.status === "SUCCESS" && payment.flutterwave?.verified === true;
}

function hasConfirmedRent(item: ApplicationInspection) {
  const confirmedEvidence = (item.paymentEvidence ?? []).some(
    (evidence) => evidence.status === "OWNER_CONFIRMED",
  );
  const verifiedRentPayment = (item.applicationPayments ?? []).some(
    (payment) => payment.purpose === "RENT" && paymentVerified(payment),
  );
  return confirmedEvidence || verifiedRentPayment;
}

export default function ApplicationsPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<ApplicationInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [evidenceForms, setEvidenceForms] = useState<Record<string, {
    amount: string;
    paymentMethod: string;
    externalReference: string;
    note: string;
    file: File | null;
  }>>({});
  const [evidenceBusy, setEvidenceBusy] = useState<string | null>(null);
  const [rentPaymentBusy, setRentPaymentBusy] = useState<string | null>(null);
  const [rentPaymentMessages, setRentPaymentMessages] = useState<Record<string, string>>({});
  const [evidenceMessages, setEvidenceMessages] = useState<Record<string, string>>({});
  const [contractBusy, setContractBusy] = useState<string | null>(null);
  const [contractMessages, setContractMessages] = useState<Record<string, string>>({});
  const [contractNames, setContractNames] = useState<Record<string, string>>({});
  const [contractAccepted, setContractAccepted] = useState<Record<string, boolean>>({});

  async function submitContractConsent(item: ApplicationInspection) {
    const tenancy = item.tenancy;
    const legalName = (contractNames[item.id] ?? "").trim();

    if (!tenancy?.id || !tenancy.contractText || !tenancy.contractGeneratedAt) {
      setContractMessages((current) => ({
        ...current,
        [item.id]: "The owner has not generated the contract yet.",
      }));
      return;
    }
    if (tenancy.tenantConsentedAt) return;
    if (legalName.length < 3 || legalName.length > 160) {
      setContractMessages((current) => ({
        ...current,
        [item.id]: "Enter your full legal name (3–160 characters).",
      }));
      return;
    }
    if (!contractAccepted[item.id]) {
      setContractMessages((current) => ({
        ...current,
        [item.id]: "Read the contract and confirm your consent before submitting.",
      }));
      return;
    }

    setContractBusy(item.id);
    setContractMessages((current) => ({ ...current, [item.id]: "" }));
    try {
      const result = await apiFetch<{ success: boolean; message?: string }>(
        `/api/v1/leases/${encodeURIComponent(tenancy.id)}/contract/consent`,
        getToken,
        {
          method: "POST",
          body: JSON.stringify({ legalName, accepted: true }),
        },
      );

      if (!result.success) {
        throw new Error(result.message || "Contract consent could not be recorded.");
      }

      const consentedAt = new Date().toISOString();
      setRecords((current) => current.map((record) =>
        record.id === item.id
          ? {
              ...record,
              tenancy: record.tenancy
                ? {
                    ...record.tenancy,
                    tenantConsentName: legalName,
                    tenantConsentedAt: consentedAt,
                  }
                : record.tenancy,
            }
          : record,
      ));
      setContractMessages((current) => ({
        ...current,
        [item.id]: result.message || "Contract consent recorded and tenancy activated.",
      }));
    } catch (error) {
      setContractMessages((current) => ({
        ...current,
        [item.id]: error instanceof Error
          ? error.message
          : "Unable to submit contract consent.",
      }));
    } finally {
      setContractBusy(null);
    }
  }

  function updateEvidenceForm(
    inspectionId: string,
    patch: Partial<{ amount: string; paymentMethod: string; externalReference: string; note: string; file: File | null }>,
  ) {
    setEvidenceForms((current) => ({
      ...current,
      [inspectionId]: {
        ...(current[inspectionId] ?? {
          amount: "",
          paymentMethod: "",
          externalReference: "",
          note: "",
          file: null,
        }),
        ...patch,
      },
    }));
  }


  async function acceptContract(item: ApplicationInspection) {
    if (!item.tenancyId) {
      setContractMessages((current) => ({
        ...current,
        [item.id]: "The owner has not prepared a tenancy contract for this application yet.",
      }));
      return;
    }

    setContractBusy(item.id);
    setContractMessages((current) => ({ ...current, [item.id]: "" }));
    try {
      const result = await apiFetch<{
        success: boolean;
        message?: string;
        data?: { transaction?: { status?: string }; alreadyAccepted?: boolean };
      }>(
        `/api/v1/leases/${encodeURIComponent(item.tenancyId)}/accept-contract`,
        getToken,
        { method: "POST" },
      );
      const actualStatus = result.data?.transaction?.status ?? "OWNER_APPROVED";

      setRecords((current) => current.map((record) =>
        record.id === item.id
          ? { ...record, applicationStatus: actualStatus }
          : record,
      ));
      setContractMessages((current) => ({
        ...current,
        [item.id]: result.message || (
          actualStatus === "TENANCY_ACTIVE"
            ? "Contract accepted and rent confirmed. Your tenancy is active. Key handover is tracked separately."
            : "Contract acceptance recorded. Tenancy activation will complete once the owner confirms rent payment."
        ),
      }));
    } catch (error) {
      setContractMessages((current) => ({
        ...current,
        [item.id]: error instanceof Error ? error.message : "Could not accept the contract.",
      }));
    } finally {
      setContractBusy(null);
    }
  }

  async function submitEvidence(event: FormEvent<HTMLFormElement>, item: ApplicationInspection) {
    const formElement = event.currentTarget;
    event.preventDefault();
    const form = evidenceForms[item.id];
    if (!form?.file) {
      setEvidenceMessages((current) => ({ ...current, [item.id]: "Choose a receipt file before submitting." }));
      return;
    }

    setEvidenceBusy(item.id);
    setEvidenceMessages((current) => ({ ...current, [item.id]: "" }));
    const body = new FormData();
    body.set("amount", form.amount);
    body.set("paymentMethod", form.paymentMethod);
    body.set("externalReference", form.externalReference);
    body.set("note", form.note);
    body.set("evidence", form.file);

    try {
      const result = await apiFetch<{ success: boolean; message?: string; data: PaymentEvidence }>(
        `/api/v1/inspections/${encodeURIComponent(item.id)}/payment-evidence`,
        getToken,
        { method: "POST", body },
      );
      setRecords((current) => current.map((record) =>
        record.id === item.id
          ? { ...record, paymentEvidence: [result.data, ...(record.paymentEvidence ?? [])] }
          : record,
      ));
      setEvidenceForms((current) => ({
        ...current,
        [item.id]: { amount: "", paymentMethod: "", externalReference: "", note: "", file: null },
      }));
      setEvidenceMessages((current) => ({
        ...current,
        [item.id]: result.message || "Payment proof submitted for owner review.",
      }));
      const fileInput = formElement.querySelector<HTMLInputElement>('input[type="file"]');
      if (fileInput) fileInput.value = "";
    } catch (error) {
      setEvidenceMessages((current) => ({
        ...current,
        [item.id]: error instanceof Error ? error.message : "Could not submit payment proof.",
      }));
    } finally {
      setEvidenceBusy(null);
    }
  }

  async function payRentNow(item: ApplicationInspection) {
    if (!item.propertyTransactionId) {
      setRentPaymentMessages((current) => ({
        ...current,
        [item.id]: "The application payment record is unavailable. Please contact your agent.",
      }));
      return;
    }

    setRentPaymentBusy(item.id);
    setRentPaymentMessages((current) => ({ ...current, [item.id]: "" }));

    try {
      const result = await apiFetch<{
        success: boolean;
        data: { paymentLink: string; reference: string };
      }>("/api/v1/payments/rent/transaction/initialize", getToken, {
        method: "POST",
        body: JSON.stringify({ propertyTransactionId: item.propertyTransactionId }),
      });

      if (!result.data?.paymentLink) {
        throw new Error("The payment gateway did not return a checkout link.");
      }
      window.location.assign(result.data.paymentLink);
    } catch (err) {
      setRentPaymentMessages((current) => ({
        ...current,
        [item.id]: err instanceof Error ? err.message : "Unable to start rent payment.",
      }));
      setRentPaymentBusy(null);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const response = await apiFetch<InspectionResponse>(
          "/api/v1/inspections/me",
          getToken,
        );
        if (!cancelled) {
          setRecords(
            response.data
              .filter((item) =>
                item.applicationStatus
                  ? submittedStatuses.has(item.applicationStatus)
                  : false,
              )
              .sort((a, b) => {
                const aDate = a.applicationCreatedAt ?? a.createdAt ?? a.scheduledAt;
                const bDate = b.applicationCreatedAt ?? b.createdAt ?? b.scheduledAt;
                const difference = new Date(bDate).getTime() - new Date(aDate).getTime();
                return difference || b.id.localeCompare(a.id);
              }),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your applications.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, router]);

  return (
    <>
      <TopAppBar title="Applications" />
      <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
            Tenant workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-black">
            My Applications
          </h1>
          <p className="mt-2 text-sm leading-6 text-black/55">
            Track your submitted property applications, inspection details, and the owner’s decision.
          </p>
        </header>

        {!loading && !error && records.length > 0 && (
          <section className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-black/50">
                Search applications
              </span>
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="Property, address, agent, payment reference…"
                className="min-h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:border-black/40 focus:ring-2 focus:ring-[#FACC15]/60"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-black/50">
                Application status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
                className="min-h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:border-black/40 focus:ring-2 focus:ring-[#FACC15]/60"
              >
                <option value="ALL">All statuses</option>
                {Array.from(new Set(records.map((record) => record.applicationStatus).filter(Boolean))).sort().map((status) => (
                  <option key={status} value={status!}>{formatStatus(status)}</option>
                ))}
              </select>
            </label>
          </section>
        )}

        {loading ? (
          <Card className="p-5">
            <p className="animate-pulse text-sm text-black/55">
              Loading your applications…
            </p>
          </Card>
        ) : error ? (
          <Card className="space-y-3 p-5">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-10 rounded-xl border border-black/15 px-4 text-sm font-semibold"
            >
              Try again
            </button>
          </Card>
        ) : records.length ? (
          (() => {
            const needle = search.trim().toLowerCase();
            const visibleRecords = records.filter((item) => {
              if (statusFilter !== "ALL" && item.applicationStatus !== statusFilter) return false;
              if (!needle) return true;
              const paymentText = [
                ...(item.applicationPayments ?? []),
                ...(item.booking?.payment ? [item.booking.payment] : []),
              ].map((payment) => `${payment.reference} ${payment.purpose} ${payment.status}`).join(" ");
              const evidenceText = (item.paymentEvidence ?? []).map((evidence) =>
                `${evidence.externalReference ?? ""} ${evidence.paymentMethod ?? ""} ${evidence.status}`,
              ).join(" ");
              const agentText = item.assignedAgent
                ? `${item.assignedAgent.firstName ?? ""} ${item.assignedAgent.lastName ?? ""} ${item.assignedAgent.email}`
                : "";
              return `${item.property.title} ${item.property.address?.addressLine1 ?? ""} ${agentText} ${paymentText} ${evidenceText}`
                .toLowerCase().includes(needle);
            });

            const pageRecords = visibleRecords.slice((page - 1) * pageSize, page * pageSize);

            return visibleRecords.length ? (
          <div className="space-y-4">
            {pageRecords.map((item) => {
              const media = item.property.media?.[0];
              const imagePath = media?.thumbnailUrl || media?.url;
              const imageUrl = imagePath ? resolveMediaUrl(imagePath) : null;
              const status = item.applicationStatus;

              return (
                <Card key={item.id} className="overflow-hidden p-0">
                  <div>
                    <div className="relative h-48 w-full bg-black/5">
                      {imageUrl ? (
                        // The image URL comes from the existing property media API.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={item.property.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-black/40">
                          Property image unavailable
                        </div>
                      )}
                      <span className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${
                        status === "OWNER_APPROVED" || status === "ACTIVATED" || status === "TENANCY_ACTIVE"
                          ? "bg-emerald-50 text-emerald-800"
                          : status === "CANCELLED" || status === "EXPIRED"
                            ? "bg-red-50 text-red-800"
                            : "bg-amber-50 text-amber-900"
                      }`}>
                        {formatStatus(status)}
                      </span>
                    </div>

                    <div className="space-y-3 p-4">
                      <div>
                        <h2 className="text-lg font-semibold text-black">
                          {item.property.title}
                        </h2>
                        <p className="mt-1 text-sm text-black/55">
                          {item.property.address?.addressLine1 || "Address unavailable"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-black/10 pt-3">
                        <div>
                          <p className="text-xs text-black/45">Application status</p>
                          <p className="mt-1 text-sm font-semibold text-black">
                            {formatStatus(status)}
                          </p>
                        </div>
                        <Link
                          href={`/dashboard/tenant/search?propertyId=${encodeURIComponent(item.property.id)}&inspectionId=${encodeURIComponent(item.id)}`}
                          className="text-sm font-semibold text-blue-700 underline-offset-4 hover:underline"
                        >
                          View property <span aria-hidden="true">→</span>
                        </Link>
                      </div>

                      <div>
                        <p className="text-xs text-black/45">Scheduled inspection</p>
                        <p className="mt-1 text-sm text-black/70">
                          {formatDateTime(item.scheduledAt)}
                        </p>
                      </div>

                      <div className="border-t border-black/10 pt-3">
                        <p className="text-xs text-black/45">Assigned agent</p>
                        <p className="mt-1 text-sm font-semibold text-black">
                          {item.assignedAgent
                            ? [item.assignedAgent.firstName, item.assignedAgent.lastName]
                                .filter(Boolean).join(" ") || item.assignedAgent.email
                            : "Agent not assigned"}
                        </p>
                        {item.assignedAgent?.email && (
                          <p className="mt-1 break-all text-sm text-black/60">
                            {item.assignedAgent.email}
                          </p>
                        )}
                        {item.assignedAgent?.phoneNumber && (
                          <p className="mt-1 text-sm text-black/60">
                            {item.assignedAgent.phoneNumber}
                          </p>
                        )}
                      </div>

                      {status === "OWNER_APPROVED" && (
                        <section className="space-y-4 rounded-xl border border-black/10 p-4">
                          <div>
                            <h3 className="text-sm font-semibold text-black">Lease contract</h3>
                            <p className="mt-1 text-xs leading-5 text-black/55">
                              Review the recorded lease terms and confirm rent payment before accepting. Inspection fees are separate from rent.
                            </p>
                          </div>

                          {item.contractGenerationPayment && (
                            <div className="rounded-lg bg-black/[0.03] p-3 text-sm">
                              <p className="font-semibold text-black">Owner’s contract-generation payment</p>
                              <p className="mt-1 text-black/70">
                                {formatMoney(item.contractGenerationPayment.amount, item.contractGenerationPayment.currency)}
                                {" · "}{formatStatus(item.contractGenerationPayment.status)}
                              </p>
                              {item.contractGenerationPayment.status === "SUCCESS" &&
                                item.contractGenerationPayment.flutterwave?.verified !== true && (
                                  <p className="mt-1 text-xs text-amber-800">
                                    Payment is marked successful but gateway verification is not confirmed.
                                  </p>
                                )}
                            </div>
                          )}

                          {item.tenancy ? (
                            <div className="space-y-3 rounded-lg border border-black/10 p-3">
                              <div>
                                <p className="text-xs text-black/50">Lease reference</p>
                                <p className="font-semibold text-black">{item.tenancy.leaseNumber}</p>
                              </div>
                              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                                <div>
                                  <dt className="text-xs text-black/50">Lease start</dt>
                                  <dd className="font-medium text-black">{item.tenancy.startDate ? formatDateTime(item.tenancy.startDate) : "Not set"}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-black/50">Lease end</dt>
                                  <dd className="font-medium text-black">{item.tenancy.endDate ? formatDateTime(item.tenancy.endDate) : "Not set"}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-black/50">Rent</dt>
                                  <dd className="font-semibold text-black">
                                    {item.tenancy.rentAmount != null ? formatMoney(item.tenancy.rentAmount, "NGN") : "Not set"} / {formatStatus(item.tenancy.rentFrequency)}
                                  </dd>
                                </div>
                                {item.tenancy.securityDeposit != null && (
                                  <div>
                                    <dt className="text-xs text-black/50">Security deposit</dt>
                                    <dd className="font-medium text-black">{formatMoney(item.tenancy.securityDeposit, "NGN")}</dd>
                                  </div>
                                )}
                                {item.tenancy.serviceCharge != null && (
                                  <div>
                                    <dt className="text-xs text-black/50">Service charge</dt>
                                    <dd className="font-medium text-black">{formatMoney(item.tenancy.serviceCharge, "NGN")}</dd>
                                  </div>
                                )}
                                {item.tenancy.cautionFee != null && (
                                  <div>
                                    <dt className="text-xs text-black/50">Caution fee</dt>
                                    <dd className="font-medium text-black">{formatMoney(item.tenancy.cautionFee, "NGN")}</dd>
                                  </div>
                                )}
                              </dl>
                              {item.tenancy.notes && (
                                <div>
                                  <p className="text-xs text-black/50">Additional terms</p>
                                  <p className="mt-1 whitespace-pre-wrap text-sm text-black">{item.tenancy.notes}</p>
                                </div>
                              )}
                              {item.tenancy.agreementUrl ? (
                                <a
                                  href={resolveMediaUrl(item.tenancy.agreementUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex min-h-10 items-center rounded-lg border border-black/15 px-3 py-2 text-sm font-semibold text-black underline"
                                >
                                  View agreement document
                                </a>
                              ) : (
                                <p className="text-xs leading-5 text-amber-800">
                                  No downloadable agreement document is attached yet. The lease terms above are the terms currently recorded.
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="rounded-lg bg-amber-50 p-3 text-sm leading-5 text-amber-900">
                              The owner has not completed lease setup for this application. The contract terms will appear here once the tenancy details have been submitted.
                            </p>
                          )}

                          {!hasConfirmedRent(item) && (
                            <p className="text-sm text-amber-800">
                              Rent has not been confirmed for this application yet. A submitted proof marked “Reported” is not confirmation.
                            </p>
                          )}

                          <button
                            type="button"
                            disabled={
                              contractBusy === item.id ||
                              !item.tenancy ||
                              item.tenancy.id !== item.tenancyId ||
                              !hasConfirmedRent(item)
                            }
                            onClick={() => void acceptContract(item)}
                            className="min-h-11 rounded-xl bg-[#FACC15] px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {contractBusy === item.id ? "Processing..." : "Accept contract"}
                          </button>
                          {contractMessages[item.id] && (
                            <p role="status" className="text-sm text-black/70">
                              {contractMessages[item.id]}
                            </p>
                          )}
                        </section>
                      )}

                      {item.ownerPaymentDetails && [
                        "OWNER_APPROVED",
                        "ACTIVATION_PENDING",
                        "ACTIVATED",
                        "TENANCY_ACTIVE",
                        "ACTIVE",
                      ].includes((status ?? "").trim().toUpperCase()) && (
                      <section className="space-y-3 rounded-xl border border-black/10 bg-[#FACC15]/10 p-4">
                        <div>
                          <h3 className="text-sm font-semibold text-black">Owner payment details</h3>
                          <p className="mt-1 text-xs leading-5 text-black/55">
                            Confirm the amount and payment purpose with the owner before transferring money. Inspection fees are separate.
                          </p>
                        </div>
                        {item.ownerPaymentDetails?.bankName && item.ownerPaymentDetails?.accountName && item.ownerPaymentDetails?.accountNumber ? (
                          <dl className="grid gap-2 text-sm sm:grid-cols-2">
                            <div><dt className="text-xs text-black/50">Bank</dt><dd className="font-semibold text-black">{item.ownerPaymentDetails.bankName}</dd></div>
                            <div><dt className="text-xs text-black/50">Account name</dt><dd className="font-semibold text-black">{item.ownerPaymentDetails.accountName}</dd></div>
                            <div className="sm:col-span-2">
                              <dt className="text-xs text-black/50">Account number</dt>
                              <dd className="flex flex-wrap items-center gap-3 font-semibold text-black">
                                <span>{item.ownerPaymentDetails.accountNumber}</span>
                                <button
                                  type="button"
                                  onClick={() => void navigator.clipboard?.writeText(item.ownerPaymentDetails!.accountNumber)}
                                  className="rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs font-semibold"
                                >Copy number</button>
                              </dd>
                            </div>
                          </dl>
                        ) : (
                          <p className="text-sm text-black/60">The owner has not completed their bank details yet. Contact the assigned agent before making a payment.</p>
                        )}
                      </section>
                      )}

                      {item.tenancy?.contractGeneratedAt && item.tenancy.contractText && (
                        <section className="space-y-3 rounded-xl border border-black/10 p-4">
                          <div>
                            <h3 className="text-sm font-semibold text-black">Lease contract review</h3>
                            <p className="mt-1 text-xs text-black/55">
                              {item.tenancy.leaseNumber
                                ? `Lease reference: ${item.tenancy.leaseNumber}`
                                : "Review the agreement below before giving consent."}
                            </p>
                            <p className="mt-1 text-xs text-black/55">
                              Generated {formatDateTime(item.tenancy.contractGeneratedAt)}
                            </p>
                          </div>
                          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/[0.03] p-3 text-sm leading-6 text-black/80">{item.tenancy.contractText}</pre>

                          {item.tenancy.tenantConsentedAt ? (
                            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                              Consent recorded for {item.tenancy.tenantConsentName || "tenant"} on{" "}
                              {formatDateTime(item.tenancy.tenantConsentedAt)}.
                            </div>
                          ) : (
                            <form
                              className="space-y-3"
                              onSubmit={(event) => {
                                event.preventDefault();
                                void submitContractConsent(item);
                              }}
                            >
                              <label className="block text-sm">
                                <span className="mb-1 block text-xs font-semibold text-black/60">Full legal name</span>
                                <input
                                  required
                                  minLength={3}
                                  maxLength={160}
                                  value={contractNames[item.id] ?? ""}
                                  onChange={(event) => setContractNames((current) => ({
                                    ...current,
                                    [item.id]: event.target.value,
                                  }))}
                                  className="min-h-11 w-full rounded-xl border border-black/15 px-3 outline-none focus:border-black/40 focus:ring-2 focus:ring-[#FACC15]/60"
                                  autoComplete="name"
                                />
                              </label>
                              <label className="flex items-start gap-2 text-sm leading-5 text-black/75">
                                <input
                                  type="checkbox"
                                  required
                                  checked={contractAccepted[item.id] ?? false}
                                  onChange={(event) => setContractAccepted((current) => ({
                                    ...current,
                                    [item.id]: event.target.checked,
                                  }))}
                                  className="mt-1 accent-[#FACC15]"
                                />
                                <span>I have reviewed this agreement, understand its terms, and explicitly consent to it using my legal name above.</span>
                              </label>
                              <button
                                type="submit"
                                disabled={contractBusy === item.id}
                                className="min-h-11 w-full rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-bold text-black hover:brightness-95 disabled:opacity-50"
                              >
                                {contractBusy === item.id ? "Recording consent…" : "Accept Contract & Activate Tenancy"}
                              </button>
                            </form>
                          )}
                          {contractMessages[item.id] && (
                            <p role="status" className="text-sm text-black/70">{contractMessages[item.id]}</p>
                          )}
                        </section>
                      )}

                      {["ACTIVATION_PENDING", "ACTIVATED", "TENANCY_ACTIVE"].includes(item.applicationStatus ?? "") && (
                        <section className="space-y-3 rounded-xl border border-[#FACC15]/60 bg-[#FACC15]/10 p-4">
                          <div>
                            <h3 className="text-sm font-semibold text-black">Pay rent directly</h3>
                            <p className="mt-1 text-xs leading-5 text-black/60">
                              Pay through the secure gateway. Successful payments are verified automatically; you do not need to upload a receipt for this option.
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={rentPaymentBusy === item.id || !item.propertyTransactionId}
                            onClick={() => void payRentNow(item)}
                            className="min-h-11 w-full rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-bold text-black hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {rentPaymentBusy === item.id ? "Opening secure checkout…" : "Pay Rent Now"}
                          </button>
                          {rentPaymentMessages[item.id] && (
                            <p role="alert" className="text-sm text-red-700">{rentPaymentMessages[item.id]}</p>
                          )}
                          <p className="text-xs text-black/55">Prefer a bank transfer or cash payment? Use the proof-of-payment form below.</p>
                        </section>
                      )}

                      {[
                        "OWNER_APPROVED",
                        "ACTIVATION_PENDING",
                        "ACTIVATED",
                        "TENANCY_ACTIVE",
                        "ACTIVE",
                      ].includes((item.applicationStatus ?? "").trim().toUpperCase()) &&
                      !["CANCELLED", "EXPIRED"].includes(
                        (item.applicationStatus ?? "").trim().toUpperCase()
                      ) &&
                      !(item.applicationPayments ?? [])
                        .concat(item.booking?.payment ? [item.booking.payment] : [])
                        .some((payment) =>
                          payment.purpose.trim().toUpperCase() === "RENT" &&
                          (
                            payment.status.trim().toUpperCase() === "SUCCESS" ||
                            payment.flutterwave?.verified === true
                          )
                        ) &&
                      !(item.paymentEvidence ?? []).some((evidence) =>
                        ["REPORTED", "OWNER_CONFIRMED"].includes(
                          evidence.status.trim().toUpperCase()
                        )
                      ) && (
                        <form
                          onSubmit={(event) => void submitEvidence(event, item)}
                          className="space-y-3 rounded-xl border border-black/10 p-4"
                        >
                          <div>
                            <h3 className="text-sm font-semibold text-black">Submit payment proof</h3>
                            <p className="mt-1 text-xs leading-5 text-black/55">
                              Upload a receipt for rent, deposit, lease, shortlet, or purchase payments—not the inspection booking fee. The owner must review it before it is confirmed.
                            </p>
                          </div>
                          <label className="block text-sm">
                            <span className="mb-1 block text-xs font-semibold text-black/60">Amount paid (NGN)</span>
                            <input
                              required
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={evidenceForms[item.id]?.amount ?? ""}
                              onChange={(event) => updateEvidenceForm(item.id, { amount: event.target.value })}
                              className="min-h-11 w-full rounded-xl border border-black/15 px-3 outline-none focus:border-black/40 focus:ring-2 focus:ring-[#FACC15]/60"
                            />
                          </label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-sm">
                              <span className="mb-1 block text-xs font-semibold text-black/60">Payment method</span>
                              <select
                                value={evidenceForms[item.id]?.paymentMethod ?? ""}
                                onChange={(event) => updateEvidenceForm(item.id, { paymentMethod: event.target.value })}
                                className="min-h-11 w-full rounded-xl border border-black/15 bg-white px-3"
                              >
                                <option value="">Select method</option>
                                <option value="BANK_TRANSFER">Bank transfer</option>
                                <option value="CASH">Cash</option>
                                <option value="POS">POS</option>
                                <option value="OTHER">Other</option>
                              </select>
                            </label>
                            <label className="block text-sm">
                              <span className="mb-1 block text-xs font-semibold text-black/60">Payment reference (optional)</span>
                              <input
                                maxLength={150}
                                value={evidenceForms[item.id]?.externalReference ?? ""}
                                onChange={(event) => updateEvidenceForm(item.id, { externalReference: event.target.value })}
                                className="min-h-11 w-full rounded-xl border border-black/15 px-3"
                              />
                            </label>
                          </div>
                          <label className="block text-sm">
                            <span className="mb-1 block text-xs font-semibold text-black/60">Receipt / proof (JPG, PNG, WebP or PDF; max 10 MB)</span>
                            <input
                              required
                              type="file"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              onChange={(event) => updateEvidenceForm(item.id, { file: event.target.files?.[0] ?? null })}
                              className="block w-full text-sm file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-[#FACC15] file:px-3 file:font-semibold"
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="mb-1 block text-xs font-semibold text-black/60">Note (optional)</span>
                            <textarea
                              maxLength={2000}
                              rows={3}
                              value={evidenceForms[item.id]?.note ?? ""}
                              onChange={(event) => updateEvidenceForm(item.id, { note: event.target.value })}
                              className="w-full rounded-xl border border-black/15 p-3"
                              placeholder="Payment purpose or additional details"
                            />
                          </label>
                          {evidenceMessages[item.id] && (
                            <p role="status" className="text-sm text-black/70">{evidenceMessages[item.id]}</p>
                          )}
                          <button
                            type="submit"
                            disabled={
                              evidenceBusy === item.id ||
                              (item.paymentEvidence ?? []).some(
                                (evidence) => evidence.status === "REPORTED" ||
                                  evidence.status === "OWNER_CONFIRMED",
                              )
                            }
                            className="min-h-11 w-full rounded-xl bg-[#FACC15] px-4 py-2.5 text-sm font-semibold text-black hover:brightness-95 disabled:opacity-50 sm:w-auto"
                          >
                            {evidenceBusy === item.id
                              ? "Submitting…"
                              : (item.paymentEvidence ?? []).some((evidence) => evidence.status === "REPORTED")
                                ? "Proof submitted — awaiting review"
                                : (item.paymentEvidence ?? []).some((evidence) => evidence.status === "OWNER_CONFIRMED")
                                  ? "Payment proof confirmed"
                                  : "Submit payment proof"}
                          </button>
                        </form>
                      )}

                      <div className="border-t border-black/10 pt-3">
                        <h3 className="text-sm font-semibold text-black">Payment records</h3>
                        <p className="mt-1 text-xs leading-5 text-black/50">
                          Payments linked to this application, including inspection and transaction payments where available.
                        </p>
                        {(() => {
                          const bookingPayment = item.booking?.payment;
                          const payments = [
                            ...(bookingPayment ? [{ ...bookingPayment, displayLabel: "Inspection booking payment" }] : []),
                            ...(item.applicationPayments ?? [])
                              .filter((payment) => !(hasConfirmedRent(item) && payment.purpose === "RENT"))
                              .map((payment) => ({
                                ...payment,
                                displayLabel: formatStatus(payment.purpose),
                              })),
                          ];
                          const uniquePayments = payments.filter((payment, index) =>
                            payments.findIndex((other) => other.id === payment.id) === index,
                          );
                          return uniquePayments.length ? (
                            <div className="mt-3 space-y-2">
                              {uniquePayments.map((payment) => (
                                <div key={payment.id} className="rounded-xl border border-black/10 bg-black/[0.02] p-3">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-semibold text-black">{payment.displayLabel}</p>
                                      <p className="mt-1 break-all text-xs text-black/50">Ref: {payment.reference}</p>
                                    </div>
                                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black/70 ring-1 ring-black/10">
                                      {paymentVerified(payment) ? "Verified" : formatStatus(payment.status)}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm font-semibold text-black">
                                    {formatMoney(payment.amount, payment.currency)}
                                  </p>
                                  {paymentVerified(payment) && payment.flutterwave?.verifiedAt && (
                                    <p className="mt-1 text-xs text-emerald-700">
                                      Verified {formatDateTime(payment.flutterwave.verifiedAt)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-black/50">No linked payment records available yet.</p>
                          );
                        })()}
                      </div>

                      {(item.paymentEvidence ?? []).length > 0 && (
                        <div className="border-t border-black/10 pt-3">
                          <h3 className="text-sm font-semibold text-black">Submitted payment evidence</h3>
                          <div className="mt-3 space-y-2">
                            {(item.paymentEvidence ?? []).map((evidence) => {
                              const evidenceUrl = evidence.evidenceUrl
                                ? resolveMediaUrl(evidence.evidenceUrl)
                                : null;
                              return (
                                <div key={evidence.id} className="rounded-xl border border-black/10 p-3">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <p className="text-sm font-semibold text-black">
                                      {formatMoney(evidence.amount, evidence.currency)}
                                    </p>
                                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                                      {formatStatus(evidence.status)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-black/55">
                                    Submitted {formatDateTime(evidence.reportedAt)}
                                    {evidence.paymentMethod ? ` · ${formatStatus(evidence.paymentMethod)}` : ""}
                                  </p>
                                  {evidence.externalReference && (
                                    <p className="mt-1 break-all text-xs text-black/55">
                                      Reference: {evidence.externalReference}
                                    </p>
                                  )}
                                  {evidence.note && <p className="mt-2 text-sm text-black/70">{evidence.note}</p>}
                                  {evidenceUrl && (
                                    <a
                                      href={evidenceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-[#FACC15] px-3 text-sm font-semibold text-black hover:brightness-95"
                                    >
                                      View payment proof
                                    </a>
                                  )}
                                  {evidence.confirmedAt && (
                                    <p className="mt-2 text-xs text-emerald-700">
                                      Evidence confirmed {formatDateTime(evidence.confirmedAt)}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            <PaginationControls page={page} totalItems={visibleRecords.length} pageSize={pageSize} onPageChange={setPage} />
          </div>
            ) : (
              <Card className="p-6 text-center">
                <h2 className="text-base font-semibold">No matching applications</h2>
                <p className="mt-1 text-sm text-black/55">Try another search term or status filter.</p>
                <button
                  type="button"
                  onClick={() => { setSearch(""); setStatusFilter("ALL"); setPage(1); }}
                  className="mt-3 rounded-xl bg-[#FACC15] px-4 py-2 text-sm font-semibold text-black"
                >
                  Clear filters
                </button>
              </Card>
            );
          })()
        ) : (
          <Card className="space-y-2 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-2xl">
              <span aria-hidden="true">✓</span>
            </div>
            <h2 className="text-lg font-semibold">No submitted applications yet</h2>
            <p className="text-sm leading-6 text-black/55">
              Once you submit an application from an inspection, it will appear here with its current status.
            </p>
          </Card>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/dashboard/tenant/inspections"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold text-black/70 hover:bg-black/5"
          >
            My Inspections
          </Link>
          <Link
            href="/dashboard/tenant/search"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-black hover:brightness-95"
          >
            Find Properties
          </Link>
        </div>
      </main>
    </>
  );
}
