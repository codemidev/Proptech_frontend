"use client";

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { AdminAgent, AgentAuditRecord } from "@/lib/agent-governance";
import { getAgentAuditHistory, getAgentVerificationQueue } from "@/lib/agent-governance-api";
import { AgentAuditFilters } from "./AgentAuditFilters";
import { AgentAuditTable } from "./AgentAuditTable";
import { AgentAuditDetailsDrawer } from "./AgentAuditDetailsDrawer";

export function AgentAuditPage() {
  const { getToken } = useAuth();
  const [logs, setLogs] = useState<AgentAuditRecord[]>([]);
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("ALL");
  const [agentId, setAgentId] = useState("ALL");
  const [selected, setSelected] = useState<AgentAuditRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const [audit, queue] = await Promise.all([
        getAgentAuditHistory(getToken, { search, action, agentId }),
        getAgentVerificationQueue(getToken),
      ]);
      setLogs(audit.data.logs);
      setAgents(queue.agents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Agent audit history.");
    } finally { setLoading(false); setRefreshing(false); }
  }, [action, agentId, getToken, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">Agent Governance</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Audit history</h1><p className="mt-2 text-sm text-white/60">Read-only history of administrative Agent actions.</p></div>
            <div className="flex gap-2"><a href="/dashboard/admin/agents" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15">Governance</a><button type="button" onClick={() => void load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />Refresh</button></div>
          </div>
        </header>
        {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
        <section className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5"><AgentAuditFilters search={search} action={action} agentId={agentId} agents={agents} onSearch={setSearch} onAction={setAction} onAgent={setAgentId} /></div>
          {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" />Loading audit history…</div> : <AgentAuditTable logs={logs} onSelect={setSelected} />}
        </section>
      </div>
      <AgentAuditDetailsDrawer log={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
