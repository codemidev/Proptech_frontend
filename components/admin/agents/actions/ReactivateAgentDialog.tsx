"use client";

import { useState } from "react";
import type { AdminAgent } from "@/lib/agent-governance";
import { reactivateAgent } from "@/lib/agent-governance-api";
import { DialogActions, DialogError, DialogShell } from "./DialogShell";

export function ReactivateAgentDialog({ agent, getToken, onClose, onSuccess }: { agent: AdminAgent; getToken: () => Promise<string | null>; onClose: () => void; onSuccess: () => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (reason.trim().length > 2000) { setError("Reason must be 2000 characters or fewer."); return; }
    setSubmitting(true); setError("");
    try { await reactivateAgent(agent.id, reason || undefined, getToken); await onSuccess(); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to reactivate Agent."); }
    finally { setSubmitting(false); }
  }
  return <DialogShell title="Reactivate Agent" onClose={onClose}><p className="mt-3 text-sm text-slate-500">The server will verify that the Agent is eligible for reactivation.</p><label className="mt-4 block"><span className="mb-2 block text-sm font-semibold text-slate-700">Optional reason</span><textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} rows={4} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400" placeholder="Optional administrative note…"/><span className="mt-1 block text-right text-[11px] text-slate-400">{reason.length} / 2000</span></label>{error && <DialogError>{error}</DialogError>}<DialogActions submitting={submitting} onClose={onClose} onSubmit={() => void submit()} submitLabel="Reactivate Agent" variant="green" /></DialogShell>;
}
