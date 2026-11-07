import { FileClock, RefreshCw, ShieldCheck } from "lucide-react";

export function AgentGovernanceHeader({
  refreshing,
  onRefresh,
  onAudit,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  onAudit: () => void;
}) {
  return (
    <header className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80">
            <ShieldCheck size={14} />
            Agent Governance
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Verification & clearance
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
            Review Agents, assign clearance tiers, and control account status within the active organization.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onAudit}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
          >
            <FileClock size={16} />
            Audit history
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}
