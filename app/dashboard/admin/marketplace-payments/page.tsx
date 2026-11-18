"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, LoaderCircle, RefreshCw, XCircle } from "lucide-react";
import { apiFetch, resolveMediaUrl } from "@/lib/api";

type Obligation = {
  id: string; reference: string; amount: string | number; currency: string; status: string;
  accountName: string; accountNumber: string; proofOriginalName: string | null;
  proofMimeType: string | null; proofSubmittedAt: string | null;
  buyer: { id: string; firstName: string | null; lastName: string | null; email: string; phoneNumber: string | null };
  order: { id: string; orderNumber: string; status: string };
};
type Api<T> = { success: boolean; data: T; message?: string };
const money = (value: string | number, currency = "NGN") => new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));

export default function MarketplacePaymentReviewPage() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceName, setEvidenceName] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await apiFetch<Api<Obligation[]>>("/api/v1/marketplace/admin/marketplace/payments", getToken);
      setItems(result.data || []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load platform payment proofs."); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { void load(); }, [load]);

  async function viewEvidence(item: Obligation) {
    setError("");
    try {
      const token = await getToken();
      const response = await fetch(resolveMediaUrl(`/api/v1/marketplace/admin/marketplace/payments/${item.id}/evidence`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Unable to open submitted evidence.");
      const blob = await response.blob();
      if (evidenceUrl) URL.revokeObjectURL(evidenceUrl);
      setEvidenceUrl(URL.createObjectURL(blob));
      setEvidenceName(item.proofOriginalName || item.reference);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to open submitted evidence."); }
  }

  async function review(item: Obligation, status: "VERIFIED" | "REJECTED") {
    const reason = status === "REJECTED" ? window.prompt("Reason for rejecting this Aviritech platform payment proof?")?.trim() : "";
    if (status === "REJECTED" && !reason) return;
    setBusy(item.id); setError(""); setNotice("");
    try {
      await apiFetch<Api<Obligation>>(`/api/v1/marketplace/admin/marketplace/payments/${item.id}/review`, getToken, {
        method: "POST", body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
      });
      setNotice(status === "VERIFIED" ? "Aviritech platform charge verified." : "Platform charge proof rejected. The customer can upload replacement evidence.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to review this platform payment."); }
    finally { setBusy(""); }
  }

  function closeEvidence() {
    if (evidenceUrl) URL.revokeObjectURL(evidenceUrl);
    setEvidenceUrl(""); setEvidenceName("");
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-slate-950">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Link href="/dashboard/admin/settings" className="font-black text-[#1A3C6E]">AVIRITECH <span className="font-medium text-slate-500">Marketplace payments</span></Link><Link href="/dashboard/admin" className="flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16}/>Admin dashboard</Link></div></header>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#1A3C6E]">Finance verification</p><h1 className="mt-2 text-3xl font-black">Aviritech platform transfers</h1><p className="mt-2 text-sm text-slate-500">Verify only the separate platform-charge transfers received by Aviritech.</p></div><button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"><RefreshCw size={16} className={loading?"animate-spin":""}/>Refresh</button></div>
        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
        {loading ? <div className="flex justify-center py-24 text-sm text-slate-500"><LoaderCircle className="mr-2 animate-spin"/>Loading payment proofs…</div> :
          items.length===0 ? <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={30}/><h2 className="mt-3 font-black">No platform payments awaiting review</h2><p className="mt-1 text-sm text-slate-500">New Kuun platform-charge proofs will appear here.</p></div> :
          <div className="mt-7 grid gap-4 lg:grid-cols-2">{items.map(item=><article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-black">{item.order.orderNumber}</h2><p className="mt-1 text-xs text-slate-500">Reference: {item.reference}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{item.status.replaceAll("_"," ")}</span></div>
            <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><p><span className="text-slate-500">Customer:</span> <strong>{[item.buyer.firstName,item.buyer.lastName].filter(Boolean).join(" ")||item.buyer.email}</strong></p><p><span className="text-slate-500">Amount:</span> <strong>{money(item.amount,item.currency)}</strong></p><p><span className="text-slate-500">Aviritech account:</span> <strong>{item.accountName}</strong></p><p><span className="text-slate-500">Account number:</span> <strong>{item.accountNumber}</strong></p>{item.proofSubmittedAt&&<p className="text-xs text-slate-500 sm:col-span-2">Submitted: {new Date(item.proofSubmittedAt).toLocaleString("en-NG")}</p>}</div>
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={()=>void viewEvidence(item)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"><Eye size={14}/>View proof</button><button type="button" disabled={busy===item.id} onClick={()=>void review(item,"VERIFIED")} className="inline-flex items-center gap-2 rounded-lg bg-[#1A3C6E] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 size={14}/>Verify receipt</button><button type="button" disabled={busy===item.id} onClick={()=>void review(item,"REJECTED")} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50"><XCircle size={14}/>Reject proof</button></div>
          </article>)}</div>}
      </div>
      {evidenceUrl&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" role="dialog" aria-modal="true" aria-label="Platform payment evidence"><div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><p className="truncate pr-4 text-sm font-bold">{evidenceName}</p><button type="button" onClick={closeEvidence} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold">Close</button></div><iframe title="Platform payment evidence" src={evidenceUrl} className="min-h-[70vh] w-full"/></div></div>}
    </main>
  );
}
