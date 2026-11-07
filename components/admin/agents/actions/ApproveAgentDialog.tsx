"use client";

import { useState } from "react";
import type { AgentClearanceTier, AdminAgent } from "@/lib/agent-governance";
import { approveAgent } from "@/lib/agent-governance-api";
import { DialogActions, DialogError, DialogShell } from "./DialogShell";

const tiers: Array<{ value: AgentClearanceTier; label: string; description: string }> = [
  { value: "TIER_1", label: "Tier 1", description: "Standard Agent clearance" },
  { value: "TIER_2", label: "Tier 2", description: "Elevated Agent clearance" },
  { value: "TIER_3", label: "Tier 3", description: "Highest Agent clearance" },
];

export function ApproveAgentDialog({ agent, getToken, onClose, onSuccess }: { agent: AdminAgent; getToken: () => Promise<string | null>; onClose: () => void; onSuccess: () => Promise<void> }) {
  const [tier, setTier] = useState<AgentClearanceTier>(agent.agentClearanceTier ?? "TIER_1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true); setError("");
    try { await approveAgent(agent.id, tier, getToken); await onSuccess(); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to approve Agent."); }
    finally { setSubmitting(false); }
  }

  return (
    <DialogShell title="Approve Agent" onClose={onClose}>
      <p className="mt-3 text-sm text-slate-500">Approval activates the account and assigns its initial clearance tier.</p>
      <div className="mt-4 space-y-2">
        {tiers.map((item) => (
          <button key={item.value} type="button" onClick={() => setTier(item.value)} className={`w-full rounded-xl border p-3 text-left transition ${tier === item.value ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
          </button>
        ))}
      </div>
      {error && <DialogError>{error}</DialogError>}
      <DialogActions submitting={submitting} onClose={onClose} onSubmit={() => void submit()} submitLabel="Approve Agent" />
    </DialogShell>
  );
}
