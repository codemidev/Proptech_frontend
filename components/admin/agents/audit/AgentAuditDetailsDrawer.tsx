"use client";

import type { AgentAuditRecord } from "@/lib/agent-governance";

function name(log: AgentAuditRecord) {
  return log.agent ? ([log.agent.firstName, log.agent.lastName].filter(Boolean).join(" ").trim() || log.agent.email) : log.entityId;
}
function actor(log: AgentAuditRecord) {
  return log.actor ? ([log.actor.firstName, log.actor.lastName].filter(Boolean).join(" ").trim() || log.actor.email) : "Unknown administrator";
}

export function AgentAuditDetailsDrawer({ log, onClose }: { log: AgentAuditRecord | null; onClose: () => void }) {
  if (!log) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close audit detail" onClick={onClose} className="absolute inset-0 bg-slate-950/40" />
      <aside className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Audit event</p><h2 className="mt-1 font-bold text-slate-900">{log.eventAction || log.action}</h2></div><button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50">Close</button></div>
        <div className="space-y-5 p-5">
          <Field label="Agent" value={name(log)} />
          <Field label="Administrator" value={actor(log)} />
          <Field label="Timestamp" value={new Date(log.createdAt).toLocaleString()} />
          <Field label="Entity" value={`${log.entity} / ${log.entityId}`} />
          <Field label="Reason" value={log.description || "No reason recorded"} />
          <div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Metadata</p><pre className="mt-2 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-white">{JSON.stringify(log.metadata ?? {}, null, 2)}</pre></div>
        </div>
      </aside>
    </div>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p><p className="mt-1 text-sm text-slate-800">{value}</p></div>;
}
