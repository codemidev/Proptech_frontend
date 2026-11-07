import type { AgentAuditRecord } from "@/lib/agent-governance";
import { AgentAuditRow } from "./AgentAuditRow";

export function AgentAuditTable({ logs, onSelect }: { logs: AgentAuditRecord[]; onSelect: (log: AgentAuditRecord) => void }) {
  if (!logs.length) return <div className="p-10 text-center text-sm text-slate-500">No Agent audit events match the current filters.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[900px] w-full text-left">
        <thead><tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-[0.08em] text-slate-400"><th className="px-5 py-3">Timestamp</th><th className="px-5 py-3">Agent</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Reason</th><th className="px-5 py-3">Administrator</th></tr></thead>
        <tbody>{logs.map((log) => <AgentAuditRow key={log.id} log={log} onSelect={onSelect} />)}</tbody>
      </table>
    </div>
  );
}
