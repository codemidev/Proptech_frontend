"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { BadgeCheck, Copy, Printer, ShieldCheck } from "lucide-react";
import { apiFetch, resolveMediaUrl } from "@/lib/api";

type AgentCardData = {
  agent: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    avatar: string | null;
    siteIdentityPhotoUrl?: string | null;
    clearanceTier: string | null;
  };
  credentialCode: string;
  qrPayload: string;
  issuedAt: string;
};

export function AgentVerificationIdCard() {
  const { getToken } = useAuth();
  const [data, setData] = useState<AgentCardData | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch<{ success: boolean; data: AgentCardData }>("/api/v1/agents/me/verification-card", getToken)
      .then((response) => { if (active) setData(response.data); })
      .catch((cause) => { if (active) { setData(null); setError(cause instanceof Error ? cause.message : "Unable to load your Field ID card."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [getToken]);

  function printCard() { window.print(); }

  async function copyId() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.qrPayload);
      setNotice("Agent QR code text copied.");
    } catch {
      setNotice("Copy is unavailable on this browser.");
    }
  }

  if (loading) return <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading your Aviritech Field ID card…</section>;
  if (!data) return <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="font-semibold text-amber-900">Your Field ID card is not available yet.</p><p className="mt-1 text-sm text-amber-800">{error || "Complete identity registration or contact an administrator."}</p></section>;
  const fullName = [data.agent.firstName, data.agent.lastName].filter(Boolean).join(" ") || "Aviritech Agent";
  const qrImage = "https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=" + encodeURIComponent(data.qrPayload);

  return (
    <section id="agent-field-id-card" className="mt-5 overflow-hidden rounded-2xl border border-[#1A3C6E]/15 bg-white shadow-sm print:mt-0 print:rounded-none print:border-2 print:border-[#1A3C6E] print:shadow-none">
      <div className="flex items-center justify-between gap-3 bg-[#1A3C6E] px-5 py-4 text-white">
        <div className="flex items-center gap-2"><ShieldCheck size={19} /><div><p className="text-sm font-bold">Aviritech Verified Agent ID</p><p className="text-[10px] text-white/70">Digital inspection identity card</p></div></div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold text-emerald-200"><BadgeCheck size={13} /> VERIFIED</span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          {(data.agent.siteIdentityPhotoUrl || data.agent.avatar) ? <img src={resolveMediaUrl(data.agent.siteIdentityPhotoUrl || data.agent.avatar)} alt={fullName} className="h-16 w-16 rounded-xl border border-slate-200 object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-2xl font-bold text-[#1A3C6E]">{fullName.slice(0,1)}</div>}
          <div className="min-w-0"><p className="text-base font-bold text-slate-950">{fullName}</p><p className="mt-1 text-xs text-slate-500">{data.agent.phoneNumber || "Aviritech Agent"}</p><p className="mt-2 break-all font-mono text-sm font-bold tracking-wide text-[#1A3C6E]">{data.credentialCode}</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">KYC cleared · {data.agent.clearanceTier?.replaceAll("_"," ") || "Verified agent"}</p></div>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-slate-100 bg-white p-2">
          <img src={qrImage} alt="Aviritech agent verification QR code" width={156} height={156} className="h-36 w-36 object-contain" />
          <button type="button" onClick={printCard} className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[#1A3C6E] hover:bg-slate-50"><Printer size={13} /> Print / Save card</button>
          <button type="button" onClick={() => void copyId()} className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[#1A3C6E] hover:bg-slate-50"><Copy size={13} /> Copy QR payload</button>
        </div>
      </div>
      <p className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-[11px] leading-5 text-slate-500">Show this card to the tenant at the inspection. The QR only identifies your Aviritech profile; the tenant&apos;s scan also checks your live assignment and compares your photo. Never lend or share this ID.</p>
      {notice && <p role="status" className="px-4 pb-3 text-xs text-emerald-700 print:hidden">{notice}</p>}
      <style jsx global>{`@media print { body * { visibility: hidden !important; } #agent-field-id-card, #agent-field-id-card * { visibility: visible !important; } #agent-field-id-card { position: absolute; inset: 0; width: 100%; margin: 0; } #agent-field-id-card button, #agent-field-id-card p.border-t { display: none !important; } }`}</style>
    </section>
  );
}
