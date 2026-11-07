"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import PaginationControls from "@/components/PaginationControls";

type Property = {
  id: string; propertyCode: string; title: string; status: string;
  listingType: string; price: string | number; currency: string;
  owner?: { firstName: string | null; lastName: string | null; email: string } | null;
  propertyType?: { name: string } | null;
};
type ResponseData = { success: boolean; data: { properties: Property[]; pagination: { page: number; limit: number; total: number; totalPages: number } }; message?: string };

export default function AdminPropertyVerificationPage() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<Property[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [busy, setBusy] = useState(true);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const r = await apiFetch<ResponseData>(`/api/v1/admin/properties/pending?page=${page}&limit=${pageSize}`, getToken);
      setItems(r.data.properties);
      setTotal(r.data.pagination.total);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load pending properties."); }
    finally { setBusy(false); }
  }, [getToken, page]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- API loading synchronizes page state.
  useEffect(() => { void load(); }, [load]);

  async function review(id: string, decision: "approve" | "reject") {
    if (decision === "reject" && !window.confirm("Reject this property and keep it unpublished?")) return;
    setAction(id); setError("");
    try {
      await apiFetch(`/api/v1/admin/properties/${id}/${decision}`, getToken, {
        method: "POST",
        ...(decision === "reject" ? { body: JSON.stringify({ reason: "Did not pass administrator property verification." }) } : {}),
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Review action failed."); }
    finally { setAction(""); }
  }

  return <main className="min-h-screen bg-[#f7f7f5] p-4 text-slate-900 sm:p-8">
    <div className="mx-auto max-w-6xl">
      <a href="/dashboard/admin" className="text-sm font-semibold text-slate-600 hover:text-black">← Admin dashboard</a>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-yellow-700">AVIRITECH PROPTECH</p>
          <h1 className="mt-2 text-3xl font-black">Property verification</h1>
          <p className="mt-2 text-sm text-slate-500">Review submitted listings before tenant publication.</p></div>
        <button onClick={() => void load()} className="rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-bold text-slate-950">Refresh queue</button>
      </div>
      {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex justify-between border-b p-5"><h2 className="font-bold">Pending review</h2><span className="text-sm text-slate-500">{total} total · {items.length} on this page</span></div>
        {busy ? <p className="p-8 text-sm text-slate-500">Loading verification queue…</p> : items.length === 0 ?
          <p className="p-8 text-sm text-slate-500">No properties are awaiting verification.</p> :
          <div className="divide-y">{items.map(p => <article key={p.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><p className="text-xs font-semibold text-slate-500">{p.propertyCode} · {p.status}</p>
              <h3 className="mt-1 font-bold">{p.title}</h3><p className="mt-1 text-sm text-slate-600">{p.propertyType?.name ?? p.listingType} · {p.currency} {Number(p.price).toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">Owner: {[p.owner?.firstName, p.owner?.lastName].filter(Boolean).join(" ") || p.owner?.email || "Not available"}</p></div>
            <div className="flex shrink-0 gap-2"><button disabled={!!action} onClick={() => void review(p.id, "reject")} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Reject</button>
              <button disabled={!!action} onClick={() => void review(p.id, "approve")} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{action === p.id ? "Saving…" : "Verify & publish"}</button></div>
          </article>)}</div>}
        {!busy && total > 0 && <div className="px-5"><PaginationControls page={page} totalItems={total} pageSize={pageSize} onPageChange={setPage} /></div>}
      </section>
    </div>
  </main>;
}
