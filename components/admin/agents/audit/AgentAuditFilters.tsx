"use client";

import { Search } from "lucide-react";
import type { AdminAgent } from "@/lib/agent-governance";

export function AgentAuditFilters({
  search,
  action,
  agentId,
  agents,
  onSearch,
  onAction,
  onAgent,
}: {
  search: string;
  action: string;
  agentId: string;
  agents: AdminAgent[];
  onSearch: (value: string) => void;
  onAction: (value: string) => void;
  onAgent: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 lg:grid-cols-3">
      <label className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search Agent or event" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400" />
      </label>
      <select value={action} onChange={(e) => onAction(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none">
        <option value="ALL">All actions</option>
        <option value="AGENT_APPROVED">Agent approved</option>
        <option value="AGENT_REJECTED">Agent rejected</option>
        <option value="AGENT_TIER_CHANGED">Tier changed</option>
        <option value="AGENT_SUSPENDED">Suspended</option>
        <option value="AGENT_REACTIVATED">Reactivated</option>
      </select>
      <select value={agentId} onChange={(e) => onAgent(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none">
        <option value="ALL">All Agents</option>
        {agents.map((agent) => <option key={agent.id} value={agent.id}>{[agent.firstName, agent.lastName].filter(Boolean).join(" ") || agent.email}</option>)}
      </select>
    </div>
  );
}
