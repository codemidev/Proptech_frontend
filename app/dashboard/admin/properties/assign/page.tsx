"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

type Agent = { id: string; firstName: string | null; lastName: string | null; email: string; phoneNumber?: string | null };
type Property = {
  id: string; propertyCode: string; title: string; status: string; published: boolean;
  agentId: string | null; agent: Agent | null;
  address: { addressLine1: string; state: { id: string; name: string }; localGovernment: { id: string; name: string } | null; city: { name: string } } | null;
};
type Data = {
  success: boolean;
  data: {
    properties: Property[];
    agents: Agent[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
  message?: string;
};
type Option = { id: string; name: string };
type OptionsResponse = { success: boolean; data: Option[] };

export default function AdminAgentAssignmentPage() {
  const { getToken } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [lgas, setLgas] = useState<Option[]>([]);
  const [stateId, setStateId] = useState("");
  const [lgaId, setLgaId] = useState("");
  const [page, setPage] = useState(1);
  const [agentSearch, setAgentSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const qs = new URLSearchParams();
      if (stateId) qs.set("stateId", stateId);
      if (lgaId) qs.set("localGovernmentId", lgaId);
      qs.set("page", String(page));
      qs.set("limit", "20");
      const [data, countries] = await Promise.all([
        apiFetch<Data>(`/api/v1/admin/properties/assignment-data${qs.size ? `?${qs}` : ""}`, getToken),
        apiFetch<OptionsResponse>("/api/v1/locations/countries", getToken),
      ]);
      setProperties(data.data.properties);
      setAgents(data.data.agents);
      setPagination(data.data.pagination);
      const nigeria = countries.data.find(c => c.name.toLowerCase() === "nigeria");
      if (nigeria) {
        const statesResponse = await apiFetch<OptionsResponse>(`/api/v1/locations/states?countryId=${encodeURIComponent(nigeria.id)}`, getToken);
        setStates(statesResponse.data);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load agent assignment data."); }
    finally { setBusy(false); }
  }, [getToken, stateId, lgaId, page]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let alive = true;
    if (!stateId) { setLgas([]); setLgaId(""); return; }
    apiFetch<OptionsResponse>(`/api/v1/locations/local-governments?stateId=${encodeURIComponent(stateId)}`, getToken)
      .then(r => { if (alive) setLgas(r.data); })
      .catch(() => { if (alive) setLgas([]); });
    return () => { alive = false; };
  }, [stateId, getToken]);

  async function assign(propertyId: string) {
    const agentId = choices[propertyId];
    if (!agentId) { setError("Select an agent for the property first."); return; }
    setSaving(propertyId); setError("");
    try {
      await apiFetch(`/api/v1/admin/properties/${propertyId}/assign-agent`, getToken, {
        method: "PATCH", body: JSON.stringify({ agentId }),
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Agent assignment failed."); }
    finally { setSaving(""); }
  }

  return <main className="min-h-screen bg-[#f7f7f5] p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-6xl">
    <a href="/dashboard/admin" className="text-sm font-semibold text-slate-600 hover:text-black">← Admin dashboard</a>
    <div className="mt-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-yellow-700">AVIRITECH PROPTECH</p>
      <h1 className="mt-2 text-3xl font-black">Agent assignment</h1><p className="mt-2 text-sm text-slate-500">Assign active, verified agents in your organization to properties by location.</p></div>
    <section className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
      <label className="text-xs font-bold text-slate-600">STATE<select value={stateId} onChange={e => { setPage(1); setStateId(e.target.value); setLgaId(""); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"><option value="">All states</option>{states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-600">LOCAL GOVERNMENT<select value={lgaId} onChange={e => { setPage(1); setLgaId(e.target.value); }} disabled={!stateId} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"><option value="">All LGAs</option>{lgas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      <div className="flex items-end"><button onClick={() => { setPage(1); setStateId(""); setLgaId(""); }} className="w-full rounded-xl bg-[#FACC15] p-3 text-sm font-bold text-slate-950">Clear filters</button></div>
    </section>
    {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b p-5"><h2 className="font-bold">Properties</h2><p className="mt-1 text-sm text-slate-500">{pagination.total} results · {agents.length} verified agents available</p><label className="mt-4 block text-xs font-bold text-slate-600">SEARCH VERIFIED AGENTS<input value={agentSearch} onChange={e => setAgentSearch(e.target.value)} placeholder="Search name or email" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal sm:max-w-md" /></label></div>
      {busy ? <p className="p-8 text-sm text-slate-500">Loading properties…</p> : properties.length === 0 ? <p className="p-8 text-sm text-slate-500">No properties match these filters.</p> :
        <div className="divide-y">{properties.map(p => <article key={p.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0"><p className="text-xs font-semibold text-slate-500">{p.propertyCode} · {p.status}{p.published ? " · Published" : " · Unpublished"}</p><h3 className="mt-1 font-bold">{p.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{[p.address?.addressLine1, p.address?.city.name, p.address?.localGovernment?.name, p.address?.state.name].filter(Boolean).join(", ") || "Address not available"}</p>
            <p className="mt-1 text-xs text-slate-500">Current agent: {p.agent ? `${p.agent.firstName ?? ""} ${p.agent.lastName ?? ""}`.trim() || p.agent.email : "Unassigned"}</p></div>
          <div className="flex flex-col gap-2 sm:flex-row lg:min-w-[360px]"><select aria-label={`Agent for ${p.title}`} value={choices[p.id] ?? p.agentId ?? ""} onChange={e => setChoices(prev => ({ ...prev, [p.id]: e.target.value }))} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-3 text-sm"><option value="">Select verified agent</option>{agents.filter(a => `${a.firstName ?? ""} ${a.lastName ?? ""} ${a.email}`.toLowerCase().includes(agentSearch.trim().toLowerCase())).map(a => <option key={a.id} value={a.id}>{[a.firstName, a.lastName].filter(Boolean).join(" ") || a.email} — {a.email}</option>)}</select>
            <button disabled={!!saving || !agents.length} onClick={() => void assign(p.id)} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving === p.id ? "Saving…" : "Assign agent"}</button></div>
        </article>)}</div>}
      {!busy && pagination.totalPages > 1 && <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4"><p className="text-xs text-slate-500">Page {pagination.page} of {pagination.totalPages}</p><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Previous</button><button disabled={page >= pagination.totalPages} onClick={() => setPage(value => Math.min(pagination.totalPages, value + 1))} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Next</button></div></div>}
    </section>
  </div></main>;
}
