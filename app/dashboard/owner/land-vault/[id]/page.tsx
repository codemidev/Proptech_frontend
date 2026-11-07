"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  Check,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type WorkflowStage =
  | "DRAFT"
  | "PAYMENT_PENDING"
  | "PAYMENT_CONFIRMED"
  | "OWNER_COMPLETION_REQUIRED"
  | "OWNER_COMPLETED"
  | "DUE_DILIGENCE_PENDING"
  | "UNDER_DUE_DILIGENCE"
  | "AGENT_APPROVED"
  | "AGENT_REJECTED"
  | "ADMIN_REVIEW"
  | "ADMIN_APPROVED"
  | "ADMIN_REJECTED"
  | "BLOCKCHAIN_PENDING"
  | "BLOCKCHAIN_ANCHORED"
  | "CERTIFIED"
  | "SUSPENDED"
  | "ARCHIVED";

type TransitionResponse = {
  success?: boolean;
  data?: {
    id?: string;
    status?: WorkflowStage;
    vaultCode?: string;
  };
  message?: string;
};

const statusCopy: Partial<Record<
  WorkflowStage,
  {
    title: string;
    description: string;
  }
>> = {
  OWNER_COMPLETION_REQUIRED: {
    title: "Owner completion required",
    description:
      "Your payment has been confirmed. Complete the owner requirements before this LandVault can enter agent due diligence.",
  },
  OWNER_COMPLETED: {
    title: "Owner requirements completed",
    description:
      "Your owner submission has been recorded. Submit the LandVault to the assigned agent for due diligence.",
  },
  DUE_DILIGENCE_PENDING: {
    title: "Awaiting agent due diligence",
    description:
      "Your LandVault is now waiting for the assigned agent to begin verification.",
  },
};

export default function OwnerLandVaultPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const params = useParams<{ id: string }>();

  const landVaultId =
    typeof params?.id === "string" ? params.id : "";

  const [stage, setStage] = useState<WorkflowStage | null>(null);
  const [loading, setLoading] = useState(true);

  const [titleEvidence, setTitleEvidence] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [noDispute, setNoDispute] = useState(false);
  const [noEncumbrance, setNoEncumbrance] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !landVaultId) return;

    let cancelled = false;

    async function loadLandVault() {
      setLoading(true);
      setError("");

      try {
        const response = await apiFetch<{
          success?: boolean;
          data?: { status?: WorkflowStage };
          message?: string;
        }>(
          `/api/v1/land-vaults/${encodeURIComponent(landVaultId)}`,
          getToken,
        );

        if (!response?.success || !response.data?.status) {
          throw new Error(
            response?.message || "Unable to load this LandVault record.",
          );
        }

        if (!cancelled) setStage(response.data.status);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load this LandVault record.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadLandVault();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, landVaultId, getToken]);

  const copy = stage
    ? statusCopy[stage] ?? {
        title: stage.replaceAll("_", " ").toLowerCase(),
        description:
          "Your LandVault has moved to this verification stage. No owner action is available here.",
      }
    : {
        title: "Loading LandVault",
        description: "Retrieving the latest workflow status.",
      };

  const allDeclarationsComplete =
    titleEvidence &&
    locationConfirmed &&
    noDispute &&
    noEncumbrance;

  async function completeOwnerRequirements() {
    if (!landVaultId) {
      setError("The LandVault ID is missing.");
      return;
    }

    if (!allDeclarationsComplete) {
      setError(
        "Complete all four owner declarations before submitting your requirements.",
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response =
        await apiFetch<TransitionResponse>(
          `/api/v1/land-vaults/${encodeURIComponent(
            landVaultId,
          )}/transition`,
          getToken,
          {
            method: "POST",
            body: JSON.stringify({
              toStatus: "OWNER_COMPLETED",
              description:
                "Owner completed LandVault requirements and declarations.",
              metadata: {
                source: "owner-land-vault-completion",
                declarations: {
                  titleEvidence,
                  locationConfirmed,
                  noDispute,
                  noEncumbrance,
                },
              },
            }),
          },
        );

      if (!response?.success && response?.data?.status !== "OWNER_COMPLETED") {
        throw new Error(
          response?.message ||
            "The owner requirements could not be completed.",
        );
      }

      setStage("OWNER_COMPLETED");
    } catch (err) {
      console.error(
        "LandVault owner completion failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete the owner requirements.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitForDueDiligence() {
    if (!landVaultId) {
      setError("The LandVault ID is missing.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response =
        await apiFetch<TransitionResponse>(
          `/api/v1/land-vaults/${encodeURIComponent(
            landVaultId,
          )}/transition`,
          getToken,
          {
            method: "POST",
            body: JSON.stringify({
              toStatus: "DUE_DILIGENCE_PENDING",
              description:
                "Owner submitted completed LandVault requirements for agent due diligence.",
              metadata: {
                source: "owner-land-vault-handoff",
              },
            }),
          },
        );

      if (
        !response?.success &&
        response?.data?.status !== "DUE_DILIGENCE_PENDING"
      ) {
        throw new Error(
          response?.message ||
            "The LandVault could not be submitted for due diligence.",
        );
      }

      setStage("DUE_DILIGENCE_PENDING");
    } catch (err) {
      console.error(
        "LandVault due diligence handoff failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit the LandVault for due diligence.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!landVaultId) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">
            LandVault not found
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            The LandVault ID was not included in this page URL.
          </p>

          <Link
            href="/dashboard/owner/properties/new"
            className="mt-6 inline-flex rounded-xl border px-5 py-3 text-sm font-semibold"
          >
            Return to properties
          </Link>
        </div>
      </main>
    );
  }

  if (loading || !stage) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-950">
            {loading ? "Loading LandVault…" : "Unable to load LandVault"}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {loading
              ? "Retrieving the latest verification status."
              : error || "The LandVault status is unavailable."}
          </p>
          <Link
            href="/dashboard/owner"
            className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to Owner Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-600">
            LandVaultX
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Owner verification
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Complete your part of the LandVault workflow before the
            property moves into agent due diligence.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-950 p-6 text-white sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-slate-950">
                {stage === "DUE_DILIGENCE_PENDING" ? (
                  <BadgeCheck size={24} />
                ) : (
                  <ShieldCheck size={24} />
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-400">
                  {stage.replaceAll("_", " ")}
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {copy.title}
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  {copy.description}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {(() => {
              const paymentPending = ["DRAFT", "PAYMENT_PENDING"].includes(stage);
              const ownerRequired = stage === "OWNER_COMPLETION_REQUIRED";
              const ownerComplete = [
                "OWNER_COMPLETED", "DUE_DILIGENCE_PENDING",
                "UNDER_DUE_DILIGENCE", "AGENT_APPROVED", "AGENT_REJECTED",
                "ADMIN_REVIEW", "ADMIN_APPROVED", "ADMIN_REJECTED",
                "BLOCKCHAIN_PENDING", "BLOCKCHAIN_ANCHORED", "CERTIFIED",
                "SUSPENDED", "ARCHIVED",
              ].includes(stage);
              const agentStages = [
                "DUE_DILIGENCE_PENDING", "UNDER_DUE_DILIGENCE",
                "AGENT_APPROVED", "AGENT_REJECTED", "ADMIN_REVIEW",
                "ADMIN_APPROVED", "ADMIN_REJECTED", "BLOCKCHAIN_PENDING",
                "BLOCKCHAIN_ANCHORED", "CERTIFIED", "SUSPENDED", "ARCHIVED",
              ];
              const agentActive = agentStages.includes(stage);
              const agentFinished = [
                "AGENT_APPROVED", "ADMIN_REVIEW", "ADMIN_APPROVED",
                "ADMIN_REJECTED", "BLOCKCHAIN_PENDING",
                "BLOCKCHAIN_ANCHORED", "CERTIFIED", "SUSPENDED", "ARCHIVED",
              ].includes(stage);

              return (
                <div className="mb-8 grid gap-3 sm:grid-cols-3">
                  <div className={`rounded-2xl border p-4 ${
                    paymentPending ? "border-yellow-300 bg-yellow-50" : "border-slate-200 bg-white"
                  }`}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">01</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">Payment confirmed</p>
                    <p className={`mt-1 text-xs ${paymentPending ? "text-yellow-700" : "text-emerald-600"}`}>
                      {paymentPending ? "Awaiting payment" : "Complete"}
                    </p>
                  </div>

                  <div className={`rounded-2xl border p-4 ${
                    ownerRequired ? "border-yellow-300 bg-yellow-50" : "border-slate-200 bg-white"
                  }`}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">02</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">Owner completion</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ownerRequired ? "Action required" : ownerComplete ? "Complete" : "Upcoming"}
                    </p>
                  </div>

                  <div className={`rounded-2xl border p-4 ${
                    agentActive && !agentFinished ? "border-yellow-300 bg-yellow-50" : "border-slate-200 bg-white"
                  }`}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">03</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">Agent due diligence</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {!agentActive ? "Locked" :
                        stage === "DUE_DILIGENCE_PENDING" ? "Awaiting agent" :
                        stage === "UNDER_DUE_DILIGENCE" ? "In progress" :
                        stage === "AGENT_REJECTED" ? "Agent requested correction" :
                        "Agent review complete"}
                    </p>
                  </div>
                </div>
              );
            })()}

            {stage === "OWNER_COMPLETION_REQUIRED" && (
              <>
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                  <div className="flex items-start gap-3">
                    <FileCheck2
                      size={20}
                      className="mt-0.5 shrink-0 text-yellow-700"
                    />

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Confirm your owner declarations
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        These declarations are recorded as part of the
                        LandVault verification handoff. Actual document
                        storage/upload will be connected in the next
                        evidence-vault stage.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    {
                      checked: titleEvidence,
                      setChecked: setTitleEvidence,
                      text:
                        "I have valid title evidence for this property.",
                    },
                    {
                      checked: locationConfirmed,
                      setChecked: setLocationConfirmed,
                      text:
                        "The stated location corresponds to the property.",
                    },
                    {
                      checked: noDispute,
                      setChecked: setNoDispute,
                      text:
                        "I am not aware of an unresolved ownership dispute.",
                    },
                    {
                      checked: noEncumbrance,
                      setChecked: setNoEncumbrance,
                      text:
                        "I am not aware of an undisclosed encumbrance.",
                    },
                  ].map((item) => (
                    <label
                      key={item.text}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-yellow-300"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(event) =>
                          item.setChecked(
                            event.target.checked,
                          )
                        }
                        className="mt-1 h-4 w-4 accent-yellow-400"
                      />

                      <span className="text-sm leading-6 text-slate-700">
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Link
                    href="/dashboard/owner/properties/new"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
                  >
                    Return to property wizard
                  </Link>

                  <button
                    type="button"
                    disabled={
                      submitting ||
                      !allDeclarationsComplete
                    }
                    onClick={completeOwnerRequirements}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting
                      ? "Recording completion…"
                      : "Complete Owner Requirements"}
                    <Check size={17} />
                  </button>
                </div>
              </>
            )}

            {stage === "OWNER_COMPLETED" && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Check size={22} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-950">
                      Owner requirements recorded
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Your owner stage is complete. The next step is to
                      submit this LandVault to the assigned agent for
                      due diligence.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={submitForDueDiligence}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {submitting
                    ? "Submitting for due diligence…"
                    : "Submit for Agent Due Diligence"}
                  <ArrowRight size={17} />
                </button>
              </div>
            )}

            {stage === "DUE_DILIGENCE_PENDING" && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <Blocks size={22} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-950">
                      Submitted for agent due diligence
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Your LandVault has been handed over to the
                      verification stage. The assigned agent can now
                      begin due diligence.
                    </p>

                    <p className="mt-4 font-mono text-xs text-slate-500">
                      LandVault ID: {landVaultId}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {![
              "OWNER_COMPLETION_REQUIRED",
              "OWNER_COMPLETED",
              "DUE_DILIGENCE_PENDING",
            ].includes(stage) && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <Blocks size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-950">
                      {copy.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {copy.description}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      This stage is handled by the relevant verification
                      team or system process. No owner transition action
                      is available here.
                    </p>
                    <p className="mt-3 font-mono text-xs text-slate-500">
                      LandVault ID: {landVaultId}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/owner"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Back to Owner Dashboard
                <ArrowRight size={17} />
              </Link>

              <Link
                href="/dashboard/owner/properties"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
              >
                View My Properties
              </Link>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-8 border-t border-slate-200 pt-5">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={15} />
                Blockchain anchoring remains pending until the
                backend verification and blockchain stages are completed.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
