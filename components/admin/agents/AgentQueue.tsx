"use client";

import type { AdminAgent, AgentGovernanceFilters } from "@/lib/agent-governance";
import { AgentQueueFilters } from "./AgentQueueFilters";
import { AgentTable } from "./AgentTable";

export function AgentQueue({
  agents,
  filters,
  onFiltersChange,
  onClearFilters,
  onManage,
  loading,
}: {
  agents: AdminAgent[];
  filters: AgentGovernanceFilters;
  onFiltersChange: (filters: AgentGovernanceFilters) => void;
  onClearFilters: () => void;
  onManage: (agent: AdminAgent) => void;
  loading: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
      <AgentQueueFilters
        filters={filters}
        onChange={onFiltersChange}
        onClear={onClearFilters}
      />
      <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5">
        {loading ? "Loading Agent queue…" : `Showing ${agents.length} Agent${agents.length === 1 ? "" : "s"}`}
      </div>
      <AgentTable agents={agents} onManage={onManage} loading={loading} />
    </section>
  );
}
