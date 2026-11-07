"use client";

import { AlertCircle, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tierLabel, type AgentClearanceTier } from "@/lib/agent-governance";

type Profile = {
  status?: string | null;
  isActive?: boolean | null;
  isVerified?: boolean | null;
  agentClearanceTier?: AgentClearanceTier | null;
};

function normalize(value: unknown): Profile {
  if (!value || typeof value !== "object") return {};
  const data = value as Record<string, unknown>;
  const nested = data.user && typeof data.user === "object" ? data.user : data.agent && typeof data.agent === "object" ? data.agent : data;
  return nested as Profile;
}

export function AgentClearanceStatusCard() {
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch<{ success: boolean; data: unknown }>("/api/v1/agents/me", getToken);
      setProfile(normalize(response.data));
    } catch {
      setProfile(null);
    }
  }, [getToken]);

  useEffect(() => { void load(); }, [load]);
  if (!profile) return null;

  const tier = profile.agentClearanceTier ?? null;
  const pending = profile.status === "PENDING_APPROVAL";
  const rejected = profile.status === "REJECTED";
  const suspended = profile.status === "SUSPENDED" || profile.isActive === false;

  const state = pending
    ? { title: "Verification pending", body: "Your Agent account is awaiting administrative approval.", className: "border-amber-200 bg-amber-50 text-amber-800", Icon: Clock3 }
    : rejected
      ? { title: "Verification rejected", body: "Your Agent access is currently not approved.", className: "border-red-200 bg-red-50 text-red-800", Icon: AlertCircle }
      : suspended
        ? { title: "Account suspended", body: "Protected Agent actions remain unavailable until reactivation.", className: "border-orange-200 bg-orange-50 text-orange-800", Icon: AlertCircle }
        : { title: tier ? `${tierLabel(tier)} active` : "Active — tier pending", body: tier ? "Your clearance is controlled by the PropTech Admin team." : "An administrator needs to assign your clearance tier.", className: "border-emerald-200 bg-emerald-50 text-emerald-800", Icon: CheckCircle2 };

  const StatusIcon = state.Icon;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white"><ShieldCheck size={20} /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">Agent clearance</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{tierLabel(tier)}</span></div><p className="mt-1 text-sm text-slate-500">Clearance is separate from your Agent RBAC role.</p></div></div>
        <div className={`rounded-2xl border px-3.5 py-3 text-sm ${state.className}`}><div className="flex items-start gap-2.5"><StatusIcon size={17} className="mt-0.5 shrink-0" /><div><p className="font-semibold">{state.title}</p><p className="mt-0.5 text-xs opacity-80">{state.body}</p></div></div></div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {(["TIER_1", "TIER_2", "TIER_3"] as AgentClearanceTier[]).map((item) => {
          const current = tier === item;
          const included = tier === "TIER_3" || (tier === "TIER_2" && item !== "TIER_3") || (tier === "TIER_1" && item === "TIER_1");
          return <div key={item} className={`rounded-xl border p-3 ${current ? "border-slate-200 bg-slate-50 text-slate-800" : "border-slate-100 bg-slate-50/50 text-slate-500"}`}><p className="text-xs font-semibold">{tierLabel(item)}</p><p className="mt-1 text-[11px]">{current ? "Current clearance" : included ? "Included by current clearance" : "Higher clearance required"}</p></div>;
        })}
      </div>
    </section>
  );
}
