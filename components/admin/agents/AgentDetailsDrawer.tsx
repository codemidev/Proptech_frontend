"use client";

import { X } from "lucide-react";
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
