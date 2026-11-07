import { ChevronRight } from "lucide-react";
import type { AdminAgent } from "@/lib/agent-governance";
import { agentDisplayName } from "@/lib/agent-governance";
import { AgentStatusBadge } from "./AgentStatusBadge";
import { AgentTierBadge } from "./AgentTierBadge";

export function AgentMobileCard({ agent, onManage }: { agent: AdminAgent; onManage: (agent: AdminAgent) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">{agentDisplayName(agent).charAt(0).toUpperCase()}</div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{agentDisplayName(agent)}</p>
            <p className="truncate text-sm text-slate-500">{agent.email}</p>
          </div>
        </div>
        <button type="button" onClick={() => onManage(agent)} className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700">Manage <ChevronRight size={14} /></button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <AgentStatusBadge status={agent.status} />
        <AgentTierBadge tier={agent.agentClearanceTier} />
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${agent.isVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{agent.isVerified ? "Verified" : "Not verified"}</span>
      </div>
    </div>
  );
}
