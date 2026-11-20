"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { X, Printer, RefreshCw, Eye, FileText, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AdminAgent } from "@/lib/agent-governance";
import { agentDisplayName } from "@/lib/agent-governance";
import {
  getAgentKycQueue, getAgentKycAuditHistory, reviewAgentKyc, revealAgentNin,
  getAgentKycDocumentUrl, setAgentNinManually, type AdminAgentKycSubmission, type AdminAgentKycAuditEvent,
} from "@/lib/agent-governance-api";
import { AgentStatusBadge } from "./AgentStatusBadge";
import { AgentTierBadge } from "./AgentTierBadge";

export function AgentDetailsDrawer({
  open,
  agent,
  onClose,
  onApprove,
  onReject,
  onTier,
  onSuspend,
  onReactivate,
}: {
  open: boolean;
  agent: AdminAgent | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onTier: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
}) {
  const { getToken } = useAuth();
  const [identityCard, setIdentityCard] = useState<{
    agent: {
      firstName: string | null;
      lastName: string | null;
      phoneNumber: string | null;
      siteIdentityPhotoUrl: string;
      siteIdentityPhotoCapturedAt: string | null;
      clearanceTier: string | null;
      status: string;
      isActive: boolean;
      isVerified: boolean;
    };
    credentialCode: string;
    qrPayload: string;
    issuedAt: string;
  } | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityError, setIdentityError] = useState("");
  const [submissions, setSubmissions] = useState<AdminAgentKycSubmission[]>([]);
  const [kycAuditEvents, setKycAuditEvents] = useState<AdminAgentKycAuditEvent[]>([]);
  const [kycAuditError, setKycAuditError] = useState("");
  const [loadingKyc, setLoadingKyc] = useState(false);
  const [kycError, setKycError] = useState("");
  const [kycBusy, setKycBusy] = useState("");
  const [revealedNins, setRevealedNins] = useState<Record<string, string>>({});
  const [manualNin, setManualNin] = useState("");
  const [ninNotice, setNinNotice] = useState("");

  const loadKyc = useCallback(async () => {
    if (!agent) return;
    setLoadingKyc(true); setKycError(""); setKycAuditError("");
    try {
      const [result, audit] = await Promise.allSettled([
        getAgentKycQueue(getToken, agent.id), getAgentKycAuditHistory(getToken, agent.id),
      ]);
      if (result.status === "rejected") throw result.reason;
      setSubmissions(result.value.data);
      if (audit.status === "fulfilled") setKycAuditEvents(audit.value.data);
      else { setKycAuditEvents([]); setKycAuditError(audit.reason instanceof Error ? audit.reason.message : "Unable to load KYC activity history."); }
    } catch (error) {
      setKycError(error instanceof Error ? error.message : "Unable to load KYC records.");
    } finally { setLoadingKyc(false); }
  }, [agent, getToken]);

  useEffect(() => {
    if (open && agent) void loadKyc();
    if (!open) { setSubmissions([]); setKycAuditEvents([]); setKycAuditError(""); setRevealedNins({}); setManualNin(""); setNinNotice(""); setKycError(""); }
  }, [open, agent?.id, loadKyc]);

  useEffect(() => {
    setManualNin("");
    setNinNotice("");
    setRevealedNins({});
  }, [open, agent?.id]);

  useEffect(() => {
    if (!open || !agent) {
      setIdentityCard(null);
      setIdentityError("");
      return;
    }
    let active = true;
    setIdentityLoading(true);
    setIdentityError("");
    apiFetch<{ success: boolean; data: NonNullable<typeof identityCard> }>(
      `/api/v1/admin/dashboard/agents/${encodeURIComponent(agent.id)}/site-identity-card`,
      getToken,
    ).then((result) => {
      if (active) setIdentityCard(result.data);
    }).catch((error) => {
      if (active) {
        setIdentityCard(null);
        setIdentityError(error instanceof Error ? error.message : "Site identity card is not available yet.");
      }
    }).finally(() => {
      if (active) setIdentityLoading(false);
    });
    return () => { active = false; };
  }, [open, agent?.id, getToken]);

  function printIdentityCard() {
    if (!identityCard) return;
    const popup = window.open("", "_blank", "width=820,height=640");
    if (!popup) {
      setIdentityError("Allow pop-ups to print or save the Agent ID card.");
      return;
    }
    const entities: Record<string, string> = {
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    };
    const escape = (value: string) => value.replace(/[&<>"']/g, (char) => entities[char] || char);
    const name = escape([identityCard.agent.firstName, identityCard.agent.lastName].filter(Boolean).join(" ") || "Aviritech Agent");
    const photo = escape(identityCard.agent.siteIdentityPhotoUrl);
    const qr = "https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=" + encodeURIComponent(identityCard.qrPayload);
    popup.document.write(`<!doctype html><html><head><title>Aviritech Agent ID - ${name}</title><style>
      @page{size:A5 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#102b4e;margin:0}
      .card{border:2px solid #1A3C6E;border-radius:18px;overflow:hidden;max-width:760px;margin:20px auto}
      header{background:#1A3C6E;color:#fff;padding:18px 24px;font-weight:700;font-size:20px}
      main{display:flex;align-items:center;gap:24px;padding:24px}.photo{width:150px;height:150px;border-radius:14px;object-fit:cover;border:2px solid #FACC15}
      .qr{width:170px;height:170px;object-fit:contain;margin-left:auto}.name{font-size:24px;font-weight:700;margin-bottom:8px}
      .meta{font-size:13px;line-height:1.8;color:#475569}.foot{background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 24px;font-size:11px;color:#475569}
      @media print{body{margin:0}.card{margin:0;max-width:none}}
    </style></head><body><article class="card"><header>AVIRITECH PROPTECH · AGENT SITE IDENTITY</header><main><img class="photo" src="${photo}" alt="Agent selfie"><div><div class="name">${name}</div><div class="meta">Agent ID: ${escape(agent?.id || "")}<br>Phone: ${escape(identityCard.agent.phoneNumber || "Not provided")}<br>Clearance: ${escape(identityCard.agent.clearanceTier || "Pending")}<br>Status: ${escape(identityCard.agent.isActive ? (identityCard.agent.isVerified ? "Verified" : "Pending verification") : "Inactive")}<br>Issued: ${escape(new Date(identityCard.issuedAt).toLocaleDateString())}</div></div><img class="qr" src="${qr}" alt="Permanent agent QR code"></main><div class="foot">This QR identifies the agent permanently. Each property visit is verified against the current server-side inspection assignment.</div></article><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  }


  async function decideKyc(submissionId: string, status: string) {
    let reason = "";
    if (status === "MORE_INFO_REQUIRED" || status === "REJECTED") {
      const answer = window.prompt(status === "REJECTED" ? "Enter the reason for rejecting this NIN KYC submission:" : "Tell the agent what additional information is required:");
      if (!answer?.trim()) return;
      reason = answer.trim();
    }
    setKycBusy(submissionId); setKycError("");
    try { await reviewAgentKyc(submissionId, status, reason, getToken); await loadKyc(); }
    catch (error) { setKycError(error instanceof Error ? error.message : "KYC review failed."); }
    finally { setKycBusy(""); }
  }
  async function saveManualNin() {
    const value = manualNin.trim();
    if (!/^\d{11}$/.test(value)) {
      setKycError("Enter a valid 11-digit NIN.");
      return;
    }
    setKycBusy("manual-nin");
    setKycError("");
    setNinNotice("");
    try {
      const result = await setAgentNinManually(agent!.id, value, getToken);
      setManualNin("");
      setNinNotice(result.message || "NIN saved securely and queued for review.");
      await loadKyc();
    } catch (error) {
      setKycError(error instanceof Error ? error.message : "Unable to save agent NIN.");
    } finally {
      setKycBusy("");
    }
  }

  async function showNin(submissionId: string) {
    setKycBusy(submissionId); setKycError("");
    try { const result = await revealAgentNin(submissionId, getToken); setRevealedNins(v => ({...v,[submissionId]:result.data.nin})); }
    catch (error) { setKycError(error instanceof Error ? error.message : "Unable to reveal NIN."); }
    finally { setKycBusy(""); }
  }
  async function openKycDocument(documentId: string) {
    setKycBusy(documentId); setKycError("");
    try { const result = await getAgentKycDocumentUrl(documentId, getToken); window.open(result.data.url, "_blank", "noopener,noreferrer"); }
    catch (error) { setKycError(error instanceof Error ? error.message : "Unable to open identity document."); }
    finally { setKycBusy(""); }
  }

  if (!open || !agent) return null;

  const canApprove =
    agent.status === "PENDING_APPROVAL" ||
    !agent.isVerified ||
    !agent.agentClearanceTier;
  const latestKycSubmission = [...submissions].sort((a,b) => new Date(b.submittedAt).getTime()-new Date(a.submittedAt).getTime())[0];
  const hasVerifiedKyc = latestKycSubmission?.status === "VERIFIED";

  // Clearance changes are only valid after the Agent has completed
  // the initial approval transition and received a clearance tier.
  const canChangeTier =
    agent.status === "ACTIVE" &&
    agent.isActive &&
    agent.isVerified &&
    Boolean(agent.agentClearanceTier);

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close Agent details" onClick={onClose} className="absolute inset-0 bg-slate-950/40" />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Agent details</p><h2 className="mt-1 font-bold text-slate-900">{agentDisplayName(agent)}</h2></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"><X size={20} /></button>
        </div>
        <div className="space-y-6 p-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">{agent.email}</p>
            <p className="mt-1 text-xs text-slate-500">{agent.id}</p>
            <div className="mt-4 flex flex-wrap gap-2"><AgentStatusBadge status={agent.status} /><AgentTierBadge tier={agent.agentClearanceTier} /><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${agent.isVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{agent.isVerified ? "Verified" : "Not verified"}</span></div>
          </div>
          <section className="rounded-2xl border border-[#1A3C6E]/15 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div><h3 className="text-sm font-bold text-[#1A3C6E]">Onsite Face ID verification</h3><p className="mt-1 text-xs text-slate-500">Agent selfie captured onsite · permanent Site ID</p></div>
              <button type="button" onClick={() => {
                if (!agent) return;
                setIdentityLoading(true);
                apiFetch<{ success: boolean; data: NonNullable<typeof identityCard> }>(
                  `/api/v1/admin/dashboard/agents/${encodeURIComponent(agent.id)}/site-identity-card`,
                  getToken,
                ).then((result) => setIdentityCard(result.data))
                  .catch((error) => setIdentityError(error instanceof Error ? error.message : "Unable to refresh the identity card."))
                  .finally(() => setIdentityLoading(false));
              }} disabled={identityLoading} aria-label="Refresh Agent ID card" className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-50"><RefreshCw size={15} className={identityLoading ? "animate-spin" : ""} /></button>
            </div>
            {identityLoading && <p className="mt-4 text-sm text-slate-500">Loading site identity card…</p>}
            {!identityLoading && identityError && <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{identityError}</p>}
            {!identityLoading && identityCard && (
              <>
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                  <div className="bg-[#1A3C6E] px-4 py-3 text-sm font-bold text-white">AVIRITECH PROPTECH · AGENT ID</div>
                  <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="flex items-center gap-3">
                      <img src={identityCard.agent.siteIdentityPhotoUrl} alt="Agent site identity selfie" className="h-20 w-20 rounded-xl border-2 border-[#FACC15] object-cover" />
                      <div className="min-w-0"><p className="font-bold text-slate-900">{agentDisplayName(agent)}</p><p className="mt-1 text-xs text-slate-500">{identityCard.agent.phoneNumber || "Phone not provided"}</p><p className="mt-2 text-[10px] font-semibold uppercase text-emerald-700">KYC: {identityCard.agent.isVerified ? "Approved" : "Pending"}</p><p className="mt-1 text-[10px] text-slate-500">Face ID captured: {identityCard.agent.siteIdentityPhotoCapturedAt ? new Date(identityCard.agent.siteIdentityPhotoCapturedAt).toLocaleString() : "Date unavailable"}</p></div>
                    </div>
                    <div className="flex flex-col items-center rounded-lg bg-slate-50 p-2">
                      <img src={"https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=" + encodeURIComponent(identityCard.qrPayload)} alt="Permanent Agent QR code" className="h-28 w-28" />
                      <span className="mt-1 text-[10px] font-mono text-slate-500">{identityCard.credentialCode.slice(0, 12)}…</span>
                    </div>
                  </div>
                  <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">QR identity is permanent and reusable. Property assignment is checked dynamically when a customer scans it.</p>
                </div>
                <button type="button" onClick={printIdentityCard} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-bold text-[#1A3C6E] hover:bg-yellow-300"><Printer size={16} /> Print / Download Agent ID</button>
              </>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldCheck size={17}/> Identity and NIN KYC review</h3>
              <button type="button" onClick={() => void loadKyc()} disabled={loadingKyc} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><RefreshCw size={14} className={loadingKyc ? "animate-spin" : ""}/> Refresh</button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Review submitted NIN and identity evidence. Onsite Face ID is separate and does not verify NIN KYC.</p>
            {ninNotice && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{ninNotice}</p>}
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <h4 className="text-sm font-bold text-slate-900">Enter NIN manually</h4>
              <p className="mt-1 text-xs leading-5 text-slate-600">Use this when the agent cannot submit their NIN. It is encrypted before storage and the entry is recorded in the KYC audit history. Saving it does not automatically verify the agent.</p>
              {latestKycSubmission?.status === "VERIFIED" && latestKycSubmission.ninLast4 ? (
                <p className="mt-3 text-xs font-semibold text-emerald-700">This agent already has a verified NIN. Reopen the KYC review workflow before changing it.</p>
              ) : (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={11}
                    value={manualNin}
                    onChange={(event) => setManualNin(event.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="Enter 11-digit NIN"
                    aria-label="Agent NIN"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-mono text-slate-900 outline-none focus:border-[#1A3C6E] focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => void saveManualNin()}
                    disabled={Boolean(kycBusy) || manualNin.length !== 11}
                    className="rounded-lg bg-[#1A3C6E] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {kycBusy === "manual-nin" ? "Saving securely…" : "Save NIN"}
                  </button>
                </div>
              )}
            </div>
            {kycError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{kycError}</p>}
            {loadingKyc && <p className="py-4 text-sm text-slate-500">Loading KYC submissions…</p>}
            {!loadingKyc && !submissions.length && <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No NIN KYC submission found for this agent.</p>}
            <div className="mt-3 space-y-4">
              {submissions.map(s => <div key={s.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{s.status.replaceAll("_"," ")}</span><span className="text-xs text-slate-500">Submitted {new Date(s.submittedAt).toLocaleString()}</span></div>
                <div className="mt-3 text-sm"><span className="text-slate-500">National Identification Number (NIN)</span><div className="mt-1 flex flex-wrap items-center gap-2"><span className="font-mono font-semibold text-slate-900">{revealedNins[s.id] || (s.ninLast4 ? `•••••••${s.ninLast4}` : "Not submitted")}</span>{s.ninLast4 && !revealedNins[s.id] && <button type="button" onClick={() => void showNin(s.id)} disabled={Boolean(kycBusy)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"><Eye size={13}/> Reveal NIN</button>}</div></div>
                <div className="mt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Submitted identity documents</p>{!s.documents.length && <p className="text-sm text-slate-500">No documents attached.</p>}<div className="space-y-2">{s.documents.map(d => <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3"><div className="flex min-w-0 items-center gap-2"><FileText size={17}/><div className="min-w-0"><p className="break-all text-sm font-medium text-slate-800">{d.originalName}</p><p className="text-xs text-slate-500">{d.documentType.replaceAll("_"," ")} · {(d.fileSize/1024).toFixed(0)} KB</p></div></div><button type="button" onClick={() => void openKycDocument(d.id)} disabled={Boolean(kycBusy)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">{kycBusy===d.id ? "Opening…" : "View document"}</button></div>)}</div></div>
                {s.reviewReason && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Review note: {s.reviewReason}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {(s.status==="PENDING" || s.status==="MORE_INFO_REQUIRED") && <button type="button" onClick={() => void decideKyc(s.id,"UNDER_REVIEW")} disabled={Boolean(kycBusy)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Start review</button>}
                  {s.status==="UNDER_REVIEW" && <><button type="button" onClick={() => void decideKyc(s.id,"VERIFIED")} disabled={Boolean(kycBusy)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Verify NIN identity</button><button type="button" onClick={() => void decideKyc(s.id,"MORE_INFO_REQUIRED")} disabled={Boolean(kycBusy)} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800">Request more information</button><button type="button" onClick={() => void decideKyc(s.id,"REJECTED")} disabled={Boolean(kycBusy)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Reject KYC</button></>}
                </div>
                {s.reviewedAt && <p className="mt-3 text-xs text-slate-500">Last reviewed {new Date(s.reviewedAt).toLocaleString()}{s.reviewer ? ` · By ${[s.reviewer.firstName,s.reviewer.lastName].filter(Boolean).join(" ") || s.reviewer.email}` : ""}</p>}
              </div>)}
            </div>
            <div className="mt-5 border-t border-slate-200 pt-4"><h4 className="text-sm font-bold text-slate-900">KYC activity history</h4>{kycAuditError && <p className="mt-2 text-xs text-amber-700">Activity history unavailable: {kycAuditError}</p>}{!loadingKyc && !kycAuditError && !kycAuditEvents.length && <p className="mt-2 text-xs text-slate-500">No KYC audit activity recorded yet.</p>}<ol className="mt-3 space-y-2">{kycAuditEvents.map(e => <li key={e.id} className="rounded-lg border border-slate-200 p-3"><p className="text-xs font-bold text-slate-800">{e.description || e.action.replaceAll("_"," ")}</p><p className="mt-1 text-xs text-slate-500">{new Date(e.createdAt).toLocaleString()} · {[e.actor?.firstName,e.actor?.lastName].filter(Boolean).join(" ") || e.actor?.email || "System"}</p>{e.metadata.reason && <p className="mt-2 text-xs text-amber-800">Reason: {e.metadata.reason}</p>}</li>)}</ol></div>
          </section>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Administrative actions</h3>
            <div className="mt-3 grid gap-2">
              {canApprove && (<>
                {!hasVerifiedKyc && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Agent approval is locked until the latest NIN KYC submission is verified. Complete the KYC review above first.</p>}
                <button type="button" onClick={onApprove} disabled={loadingKyc || !hasVerifiedKyc} title={!hasVerifiedKyc ? "Verify the latest NIN KYC submission before approval" : undefined} className="rounded-xl bg-slate-950 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Approve Agent</button>
              </>)}
              {canChangeTier && (
                <button
                  type="button"
                  onClick={onTier}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Change clearance tier
                </button>
              )}
              {agent.status !== "REJECTED" && <button type="button" onClick={onReject} className="rounded-xl border border-red-200 px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50">Reject Agent</button>}
              {agent.status === "SUSPENDED" || agent.isActive === false ? <button type="button" onClick={onReactivate} className="rounded-xl border border-emerald-200 px-4 py-3 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50">Reactivate Agent</button> : agent.status !== "REJECTED" ? <button type="button" onClick={onSuspend} className="rounded-xl border border-orange-200 px-4 py-3 text-left text-sm font-semibold text-orange-700 hover:bg-orange-50">Suspend Agent</button> : null}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
