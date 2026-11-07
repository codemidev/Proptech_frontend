import { Clock3, PauseCircle, UserCheck, UserX, Users } from "lucide-react";
import type { AgentGovernanceStats as Stats } from "@/lib/agent-governance";

const cards = [
  ["total", "Total Agents", Users],
  ["pending", "Pending", Clock3],
  ["active", "Active", UserCheck],
  ["suspended", "Suspended", PauseCircle],
  ["rejected", "Rejected", UserX],
] as const;

export function AgentGovernanceStats({
  stats,
  loading,
}: {
  stats: Stats;
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map(([key, label, Icon]) => (
        <div key={key} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-[0.1em] text-slate-400">{label}</span>
            <span className="rounded-xl bg-slate-50 p-2 text-slate-500"><Icon size={16} /></span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{loading ? "—" : stats[key]}</p>
        </div>
      ))}
    </div>
  );
}
