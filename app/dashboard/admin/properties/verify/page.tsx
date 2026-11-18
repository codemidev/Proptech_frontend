"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import PaginationControls from "@/components/PaginationControls";

type Property = {
  id: string; propertyCode: string; title: string; status: string;
  listingType: string; price: string | number; currency: string;
  owner?: { firstName: string | null; lastName: string | null; email: string } | null;
  propertyType?: { name: string } | null;
  media?: { id: string; type: string; url: string; thumbnailUrl?: string | null }[];
  address?: { city?: { name?: string }; state?: { name?: string } } | null;
};
type ResponseData = { success: boolean; data: { properties: Property[]; pagination: { page: number; limit: number; total: number; totalPages: number } }; message?: string };

export default function AdminPropertyVerificationPage() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<Property[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const response = await apiFetch<ResponseData>("/api/v1/admin/properties/pending?page=" + page + "&limit=" + pageSize, getToken);
      setItems(response.data.properties);
      setTotal(response.data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load pending properties.");
    } finally {
      setBusy(false);
    }
  }, [getToken, page]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- API loading synchronizes page state.
  useEffect(() => { void load(); }, [load]);

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
    <div className="mx-auto max-w-6xl font-[var(--font-dm)]">
      <Link href="/dashboard/admin" className="text-sm font-semibold text-slate-600 hover:text-black">← Admin dashboard</Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-l-4 border-l-[#FACC15] pl-4">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#1A3C6E]">AVIRITECH PROPTECH</p>
          <h1 className="mt-2 text-3xl font-black">Property verification</h1>
          <p className="mt-2 text-sm text-slate-500">Inspect the complete owner submission before approving or rejecting it.</p></div>
        <button type="button" onClick={() => void load()} disabled={busy} className="rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-bold text-[#1A3C6E] shadow-sm transition hover:bg-[#EAB308] disabled:opacity-60">{busy ? "Refreshing…" : "Refresh queue"}</button>
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap justify-between gap-2 border-b p-5"><h2 className="font-bold">Pending review</h2><span className="text-sm text-slate-500">{total} total · {items.length} on this page</span></div>
        {busy ? <p className="p-8 text-sm text-slate-500">Loading verification queue…</p> : items.length === 0 ?
          <p className="p-8 text-sm text-slate-500">No properties are awaiting verification.</p> :
          <div className="divide-y">{items.map(property => {
            const preview = property.media?.find(item => item.type === "IMAGE") || property.media?.[0];
            const owner = [property.owner?.firstName, property.owner?.lastName].filter(Boolean).join(" ") || property.owner?.email || "Owner not available";
            const location = [property.address?.city?.name, property.address?.state?.name].filter(Boolean).join(", ");
            return <article key={property.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              {preview ? <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-32">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveMediaUrl(preview.thumbnailUrl || preview.url)} alt="" className="h-full w-full object-cover" />
              </div> : <div className="flex h-24 w-full shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400 sm:w-32">No media uploaded</div>}
              <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-500">{property.propertyCode} · {property.status}</p>
                <h3 className="mt-1 truncate font-bold text-slate-900">{property.title}</h3><p className="mt-1 text-sm text-slate-600">{property.propertyType?.name ?? property.listingType} · {property.currency} {Number(property.price).toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-500">Owner: {owner}</p>{location && <p className="mt-1 text-xs text-slate-500">{location}</p>}
                <p className="mt-1 text-xs text-slate-500">{property.media?.length ?? 0} media item(s) submitted</p></div>
              <Link href={"/dashboard/admin/properties/verify/" + encodeURIComponent(property.id)} className="shrink-0 rounded-xl bg-[#1A3C6E] px-5 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-[#244C83]">Review full submission →</Link>
            </article>;
          })}</div>}
        {!busy && total > 0 && <div className="px-5"><PaginationControls page={page} totalItems={total} pageSize={pageSize} onPageChange={setPage} /></div>}
      </section>
    </div>
  </main>;
}
