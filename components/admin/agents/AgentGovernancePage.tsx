"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { AgentGovernanceFilters, AgentGovernanceStats, AdminAgent } from "@/lib/agent-governance";
import { getAgentVerificationQueue, getAgentVerificationStats } from "@/lib/agent-governance-api";
import { AgentGovernanceHeader } from "./AgentGovernanceHeader";
import { AgentGovernanceStats as StatsView } from "./AgentGovernanceStats";
import { AgentTierSummary } from "./AgentTierSummary";
import { AgentQueue } from "./AgentQueue";
import { AgentDetailsDrawer } from "./AgentDetailsDrawer";
import { ApproveAgentDialog } from "./actions/ApproveAgentDialog";
import { RejectAgentDialog } from "./actions/RejectAgentDialog";
import { ChangeAgentTierDialog } from "./actions/ChangeAgentTierDialog";
import { SuspendAgentDialog } from "./actions/SuspendAgentDialog";
import { ReactivateAgentDialog } from "./actions/ReactivateAgentDialog";

const initialStats: AgentGovernanceStats = { total: 0, pending: 0, active: 0, suspended: 0, rejected: 0, tier1: 0, tier2: 0, tier3: 0 };
const initialFilters: AgentGovernanceFilters = { search: "", status: "ALL", tier: "ALL", verification: "ALL" };
type Action = null | "APPROVE" | "REJECT" | "TIER" | "SUSPEND" | "REACTIVATE";

export function AgentGovernancePage() {
  const { getToken } = useAuth();
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [stats, setStats] = useState(initialStats);
  const [filters, setFilters] = useState(initialFilters);
  const [selected, setSelected] = useState<AdminAgent | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const queue = await getAgentVerificationQueue(getToken);
      setAgents(queue.agents);
      const fallback: AgentGovernanceStats = {
        total: queue.agents.length,
        pending: queue.agents.filter((a) => a.status === "PENDING_APPROVAL").length,
        active: queue.agents.filter((a) => a.status === "ACTIVE").length,
        suspended: queue.agents.filter((a) => a.status === "SUSPENDED").length,
        rejected: queue.agents.filter((a) => a.status === "REJECTED").length,
        tier1: queue.agents.filter((a) => a.agentClearanceTier === "TIER_1").length,
        tier2: queue.agents.filter((a) => a.agentClearanceTier === "TIER_2").length,
        tier3: queue.agents.filter((a) => a.agentClearanceTier === "TIER_3").length,
      };
      setStats(await getAgentVerificationStats(getToken, fallback));
      setSelected((current) => current ? queue.agents.find((a) => a.id === current.id) ?? current : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Agent governance data.");
    } finally { setLoading(false); setRefreshing(false); }
  }, [getToken]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return agents.filter((agent) => {
      const searchMatch = !q || [agent.email, agent.firstName, agent.lastName, agent.id, agent.organization?.name, agent.organization?.slug].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      const statusMatch = filters.status === "ALL" || agent.status === filters.status;
      const tierMatch = filters.tier === "ALL" || (filters.tier === "UNASSIGNED" ? !agent.agentClearanceTier : agent.agentClearanceTier === filters.tier);
      const verificationMatch = filters.verification === "ALL" || (filters.verification === "VERIFIED" ? agent.isVerified : !agent.isVerified);
      return searchMatch && statusMatch && tierMatch && verificationMatch;
    });
  }, [agents, filters]);

  const complete = async (message: string) => { setSuccess(message); setAction(null); await load(true); };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <AgentGovernanceHeader refreshing={refreshing} onRefresh={() => void load(true)} onAudit={() => { window.location.href = "/dashboard/admin/agents/audit"; }} />
        {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
        {success && <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{success}</div>}
        <StatsView stats={stats} loading={loading} />
        <AgentTierSummary stats={stats} />
        <AgentQueue
          agents={filtered}
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={() => setFilters(initialFilters)}
          onManage={(agent) => { setSelected(agent); setAction(null); }}
          loading={loading}
        />
      </div>

      <AgentDetailsDrawer
        open={Boolean(selected)}
        agent={selected}
        onClose={() => { setSelected(null); setAction(null); }}
        onApprove={() => setAction("APPROVE")}
        onReject={() => setAction("REJECT")}
        onTier={() => setAction("TIER")}
        onSuspend={() => setAction("SUSPEND")}
        onReactivate={() => setAction("REACTIVATE")}
      />

      {selected && action === "APPROVE" && <ApproveAgentDialog agent={selected} getToken={getToken} onClose={() => setAction(null)} onSuccess={() => complete(`${selected.firstName || selected.email} has been approved.`)} />}
      {selected && action === "REJECT" && <RejectAgentDialog agent={selected} getToken={getToken} onClose={() => setAction(null)} onSuccess={() => complete(`${selected.firstName || selected.email} has been rejected.`)} />}
      {selected && action === "TIER" && <ChangeAgentTierDialog agent={selected} getToken={getToken} onClose={() => setAction(null)} onSuccess={() => complete(`${selected.firstName || selected.email}'s clearance was updated.`)} />}
      {selected && action === "SUSPEND" && <SuspendAgentDialog agent={selected} getToken={getToken} onClose={() => setAction(null)} onSuccess={() => complete(`${selected.firstName || selected.email} has been suspended.`)} />}
      {selected && action === "REACTIVATE" && <ReactivateAgentDialog agent={selected} getToken={getToken} onClose={() => setAction(null)} onSuccess={() => complete(`${selected.firstName || selected.email} has been reactivated.`)} />}
    </main>
  );
}
