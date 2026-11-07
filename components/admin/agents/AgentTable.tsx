import type { AdminAgent } from "@/lib/agent-governance";
import { AgentMobileCard } from "./AgentMobileCard";
import { AgentRow } from "./AgentRow";

export function AgentTable({ agents, onManage, loading }: { agents: AdminAgent[]; onManage: (agent: AdminAgent) => void; loading: boolean }) {
  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Loading Agent queue…</div>;
  if (!agents.length) return <div className="p-10 text-center"><p className="font-semibold text-slate-800">No Agents match the current filters</p><p className="mt-1 text-sm text-slate-500">Clear a filter or refresh the queue.</p></div>;

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-[980px] w-full text-left">
          <thead><tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-[0.08em] text-slate-400"><th className="px-5 py-3">Agent</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Verification</th><th className="px-5 py-3">Clearance</th><th className="px-5 py-3">Organization</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
          <tbody>{agents.map((agent) => <AgentRow key={agent.id} agent={agent} onManage={onManage} />)}</tbody>
        </table>
      </div>
      <div className="grid gap-3 p-4 lg:hidden">{agents.map((agent) => <AgentMobileCard key={agent.id} agent={agent} onManage={onManage} />)}</div>
    </>
  );
}
