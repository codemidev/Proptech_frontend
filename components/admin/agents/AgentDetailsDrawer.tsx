"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { X, Printer, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AdminAgent } from "@/lib/agent-governance";
import { agentDisplayName } from "@/lib/agent-governance";
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

  if (!open || !agent) return null;

  const canApprove =
    agent.status === "PENDING_APPROVAL" ||
    !agent.isVerified ||
    !agent.agentClearanceTier;

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
              <div><h3 className="text-sm font-bold text-[#1A3C6E]">Permanent Agent site identity card</h3><p className="mt-1 text-xs text-slate-500">Live selfie and reusable QR identity</p></div>
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
                      <div className="min-w-0"><p className="font-bold text-slate-900">{agentDisplayName(agent)}</p><p className="mt-1 text-xs text-slate-500">{identityCard.agent.phoneNumber || "Phone not provided"}</p><p className="mt-2 text-[10px] font-semibold uppercase text-emerald-700">{identityCard.agent.isVerified ? "KYC verified" : "Verification pending"}</p></div>
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
          <div>
            <h3 className="text-sm font-bold text-slate-900">Administrative actions</h3>
            <div className="mt-3 grid gap-2">
              {canApprove && <button type="button" onClick={onApprove} className="rounded-xl bg-slate-950 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-slate-800">Approve Agent</button>}
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
