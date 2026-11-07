"use client";

import { useState } from "react";
import type { AdminAgent } from "@/lib/agent-governance";
import { rejectAgent } from "@/lib/agent-governance-api";
import { DialogActions, DialogError, DialogShell } from "./DialogShell";

export function RejectAgentDialog({ agent, getToken, onClose, onSuccess }: { agent: AdminAgent; getToken: () => Promise<string | null>; onClose: () => void; onSuccess: () => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const valid = reason.trim().length >= 1 && reason.trim().length <= 2000;

  async function submit() {
    if (!valid) { setError("A rejection reason is required (maximum 2000 characters)."); return; }
    setSubmitting(true); setError("");
    try { await rejectAgent(agent.id, reason, getToken); await onSuccess(); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to reject Agent."); }
    finally { setSubmitting(false); }
  }

  return (
    <DialogShell title="Reject Agent" onClose={onClose}>
      <p className="mt-3 text-sm text-slate-500">Rejection marks the Agent as rejected, deactivates access, and clears the assigned clearance tier.</p>
      <label className="mt-4 block"><span className="mb-2 block text-sm font-semibold text-slate-700">Reason *</span><textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} rows={5} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400" placeholder="Explain why this Agent is being rejected…"/><span className="mt-1 block text-right text-[11px] text-slate-400">{reason.length} / 2000</span></label>
      {error && <DialogError>{error}</DialogError>}
      <DialogActions submitting={submitting} disabled={!valid} onClose={onClose} onSubmit={() => void submit()} submitLabel="Reject Agent" variant="red" />
    </DialogShell>
  );
}
