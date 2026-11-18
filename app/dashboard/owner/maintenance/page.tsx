"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  Droplets,
  Hammer,
  Home,
  Lightbulb,
  Paintbrush,
  Plug,
  ShieldCheck,
  Sparkles,
  Wind,
} from "lucide-react";

const serviceGroups = [
  { title: "Plumbing", description: "Leaks, taps, pipes, drainage and water systems.", icon: Droplets },
  { title: "Electrical", description: "Wiring, lighting, sockets and electrical faults.", icon: Plug },
  { title: "Air conditioning & HVAC", description: "Installation, servicing and cooling repairs.", icon: Wind },
  { title: "Carpentry & fittings", description: "Doors, cabinets, locks and woodwork.", icon: Hammer },
  { title: "Painting & finishing", description: "Interior painting, tiling and finishing work.", icon: Paintbrush },
  { title: "Cleaning", description: "Routine, deep and move-in cleaning.", icon: Sparkles },
  { title: "Smart home & security", description: "CCTV, smart locks, sensors and access control.", icon: Camera },
  { title: "General repairs", description: "Other household and property maintenance needs.", icon: Home },
];

export default function OwnerMaintenancePage() {
  return (
    <main className="min-h-screen bg-[#F7F8FA] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dashboard/owner" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#1A3C6E]"><ArrowLeft size={17}/> Owner dashboard</Link>
          <Link href="/marketplace" className="text-sm font-bold text-[#1A3C6E] hover:underline">Marketplace <ArrowRight className="ml-1 inline" size={15}/></Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="rounded-3xl bg-[#1A3C6E] px-6 py-8 text-white sm:px-9">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#FACC15]">Owner workspace</p>
          <h1 className="mt-2 text-3xl font-black">Maintenance & property services</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Find the right professional for repairs, upkeep and smart-home services. Start from one of your properties so the request is associated with the correct address and ownership context.</p>
          <Link href="/dashboard/owner/properties" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#FACC15] px-5 py-3 text-sm font-black text-slate-950 hover:bg-[#F5C518]">Choose a property <ArrowRight size={17}/></Link>
        </div>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-black">Service categories</h2><p className="mt-1 text-sm text-slate-500">Common services available through the Aviritech home-services ecosystem.</p></div><span className="hidden rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 sm:inline-flex">8 categories</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {serviceGroups.map((service) => { const Icon = service.icon; return <article key={service.title} className="rounded-2xl border border-slate-200 bg-white p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FACC15]/20 text-[#1A3C6E]"><Icon size={20}/></span><h3 className="mt-3 text-sm font-extrabold">{service.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{service.description}</p></article>; })}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><ClipboardList className="text-[#1A3C6E]" size={20}/><h3 className="font-black">Your property requests</h3></div><p className="mt-2 text-sm leading-6 text-slate-500">Open your property workspace to view available property actions and continue with a specific property.</p><Link href="/dashboard/owner/properties" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#1A3C6E]">Go to my properties <ArrowRight size={16}/></Link></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><ShieldCheck className="text-[#1A3C6E]" size={20}/><h3 className="font-black">Verified providers</h3></div><p className="mt-2 text-sm leading-6 text-slate-500">Provider discovery and booking will use verified vendor records. We do not display unverified or fabricated service providers.</p><p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-amber-700"><CheckCircle2 size={15}/> Provider directory integration pending</p></div>
        </section>
      </div>
    </main>
  );
}
