"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AgentVerificationIdCard } from "@/components/agent/AgentVerificationIdCard";

export default function AgentPassportPage() {
  return (
    <main className="min-h-screen bg-[#FFFDF2] px-4 py-8 text-black">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard/agent" className="inline-flex items-center gap-2 text-sm font-semibold text-black hover:text-[#8A6500] hover:underline print:hidden">
          <ArrowLeft size={16} /> Back to Agent Network
        </Link>
        <header className="mt-6 rounded-2xl bg-black p-6 text-white print:hidden">
          <div className="flex items-center gap-3"><ShieldCheck className="text-[#FACC15]" size={28} /><div><p className="text-xs font-semibold uppercase tracking-widest text-white/70">Aviritech PropTech</p><h1 className="mt-1 text-2xl font-bold">Agent digital passport</h1></div></div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">Your permanent Field ID, live identity photo and QR verification card. Keep this card available during assigned field operations.</p>
        </header>
        <AgentVerificationIdCard />
      </div>
    </main>
  );
}
