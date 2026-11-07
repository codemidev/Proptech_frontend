import { ChevronRight } from "lucide-react";
import type { AdminAgent } from "@/lib/agent-governance";
import { agentDisplayName } from "@/lib/agent-governance";
import { AgentStatusBadge } from "./AgentStatusBadge";
import { AgentTierBadge } from "./AgentTierBadge";

export function AgentRow({ agent, onManage }: { agent: AdminAgent; onManage: (agent: AdminAgent) => void }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
            {agentDisplayName(agent).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{agentDisplayName(agent)}</p>
            <p className="max-w-[250px] truncate text-sm text-slate-500">{agent.email}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{agent.id}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4"><AgentStatusBadge status={agent.status} /></td>
      <td className="px-5 py-4"><span className={`text-xs font-semibold ${agent.isVerified ? "text-emerald-700" : "text-amber-700"}`}>{agent.isVerified ? "Verified" : "Not verified"}</span></td>
      <td className="px-5 py-4"><AgentTierBadge tier={agent.agentClearanceTier} /></td>
      <td className="px-5 py-4"><p className="max-w-[180px] truncate text-sm font-medium text-slate-800">{agent.organization?.name || agent.organization?.slug || "Current organization"}</p></td>
      <td className="px-5 py-4 text-right">
        <button type="button" onClick={() => onManage(agent)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Manage <ChevronRight size={15} /></button>
      </td>
    </tr>
  );
}
