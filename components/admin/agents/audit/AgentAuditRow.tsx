import type { AgentAuditRecord } from "@/lib/agent-governance";

function targetName(log: AgentAuditRecord) {
  return log.agent ? ([log.agent.firstName, log.agent.lastName].filter(Boolean).join(" ").trim() || log.agent.email) : log.entityId;
}
function actorName(log: AgentAuditRecord) {
  return log.actor ? ([log.actor.firstName, log.actor.lastName].filter(Boolean).join(" ").trim() || log.actor.email) : "Unknown administrator";
}

export function AgentAuditRow({ log, onSelect }: { log: AgentAuditRecord; onSelect: (log: AgentAuditRecord) => void }) {
  const action = log.eventAction || log.action;
  return (
    <tr onClick={() => onSelect(log)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 last:border-0">
      <td className="px-5 py-4 text-sm text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
      <td className="px-5 py-4"><p className="font-semibold text-slate-900">{targetName(log)}</p><p className="text-xs text-slate-400">{log.entityId}</p></td>
      <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{action}</span></td>
      <td className="max-w-[340px] px-5 py-4 text-sm text-slate-500">{log.description || "—"}</td>
      <td className="px-5 py-4 text-sm text-slate-700">{actorName(log)}</td>
    </tr>
  );
}
