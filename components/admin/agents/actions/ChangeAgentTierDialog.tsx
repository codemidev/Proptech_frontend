"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { AgentClearanceTier, AdminAgent } from "@/lib/agent-governance";
import { changeAgentTier } from "@/lib/agent-governance-api";
import { DialogActions, DialogError, DialogShell } from "./DialogShell";

const tiers: Array<{ value: AgentClearanceTier; label: string }> = [
  { value: "TIER_1", label: "Tier 1" }, { value: "TIER_2", label: "Tier 2" }, { value: "TIER_3", label: "Tier 3" },
];

export function ChangeAgentTierDialog({ agent, getToken, onClose, onSuccess }: { agent: AdminAgent; getToken: () => Promise<string | null>; onClose: () => void; onSuccess: () => Promise<void> }) {
  const [tier, setTier] = useState<AgentClearanceTier>(agent.agentClearanceTier ?? "TIER_1");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState("");
  const valid = tier !== agent.agentClearanceTier && reason.trim().length >= 1 && reason.trim().length <= 2000;

  async function submit() {
    if (!valid) { setError(tier === agent.agentClearanceTier ? "Select a different clearance tier." : "Enter a reason (maximum 2000 characters)."); return; }
    setSubmitting(true); setError(""); setConflict(false);
    try { await changeAgentTier(agent.id, tier, reason, getToken); await onSuccess(); onClose(); }
    catch (err) { const message = err instanceof Error ? err.message : "Unable to update tier."; if (/conflict|updated by another|concurr/i.test(message)) setConflict(true); setError(message); }
    finally { setSubmitting(false); }
  }

  return (
    <DialogShell title="Change Agent Clearance" onClose={onClose}>
      <div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Current tier</p><p className="mt-1 font-semibold text-slate-900">{agent.agentClearanceTier?.replace("TIER_", "Tier ") ?? "Unassigned"}</p></div>
      <label className="mt-4 block"><span className="mb-2 block text-sm font-semibold text-slate-700">New tier *</span><select value={tier} onChange={(e) => setTier(e.target.value as AgentClearanceTier)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400">{tiers.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="mt-4 block"><span className="mb-2 block text-sm font-semibold text-slate-700">Reason *</span><textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} rows={4} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400" placeholder="Explain why the clearance level is changing…"/><span className="mt-1 block text-right text-[11px] text-slate-400">{reason.length} / 2000</span></label>
      {conflict && <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800"><AlertTriangle size={16} className="mt-0.5 shrink-0"/>This Agent was updated by another administrator. Refresh before trying again.</div>}
      {error && !conflict && <DialogError>{error}</DialogError>}
      <DialogActions submitting={submitting} disabled={!valid} onClose={onClose} onSubmit={() => void submit()} submitLabel="Save tier" />
    </DialogShell>
  );
}
