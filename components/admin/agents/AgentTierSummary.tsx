import type { AgentGovernanceStats } from "@/lib/agent-governance";

export function AgentTierSummary({ stats }: { stats: AgentGovernanceStats }) {
  const items = [
    ["Tier 1", stats.tier1, "border-slate-200 bg-slate-50 text-slate-900"],
    ["Tier 2", stats.tier2, "border-blue-100 bg-blue-50 text-blue-900"],
    ["Tier 3", stats.tier3, "border-violet-100 bg-violet-50 text-violet-900"],
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(([label, value, className]) => (
        <div key={label} className={`rounded-2xl border p-4 ${className}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] opacity-70">{label}</p>
          <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
      ))}
    </div>
  );
}
