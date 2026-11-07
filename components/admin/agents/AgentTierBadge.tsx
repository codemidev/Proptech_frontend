import { tierLabel, type AgentClearanceTier } from "@/lib/agent-governance";

export function AgentTierBadge({ tier }: { tier: AgentClearanceTier | null | undefined }) {
  const classes =
    tier === "TIER_3"
      ? "bg-violet-50 text-violet-700 ring-violet-200"
      : tier === "TIER_2"
        ? "bg-blue-50 text-blue-700 ring-blue-200"
        : tier === "TIER_1"
          ? "bg-slate-100 text-slate-700 ring-slate-200"
          : "bg-zinc-50 text-zinc-500 ring-zinc-200";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${classes}`}>
      {tierLabel(tier)}
    </span>
  );
}
