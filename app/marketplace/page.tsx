"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Baby,
  BedDouble,
  Boxes,
  Cable,
  Camera,
  ChevronRight,
  ClipboardList,
  CookingPot,
  Hammer,
  Home,
  Lightbulb,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Truck,
  Wrench,
} from "lucide-react";

const categories = [
  { id: "groceries", label: "Groceries & Essentials", description: "Everyday household supplies, pantry items and cleaning products.", icon: ShoppingBasket, group: "Shop" },
  { id: "furniture", label: "Furniture & Home", description: "Furniture, kitchenware, bedding, décor and home organisation.", icon: BedDouble, group: "Shop" },
  { id: "appliances", label: "Appliances & Electronics", description: "Home appliances, electronics and everyday equipment.", icon: CookingPot, group: "Shop" },
  { id: "building", label: "Home Improvement", description: "Electrical, plumbing, hardware, paint and building materials.", icon: Hammer, group: "Shop" },
  { id: "iot", label: "IoT & Smart Home", description: "Smart locks, sensors, CCTV, access control and automation.", icon: Camera, group: "Smart living" },
  { id: "networking", label: "Connectivity & Power", description: "Internet, networking, backup power and energy solutions.", icon: Cable, group: "Smart living" },
  { id: "cleaning", label: "Cleaning Services", description: "Home cleaning, deep cleaning and scheduled housekeeping.", icon: Home, group: "Services" },
  { id: "repairs", label: "Repairs & Maintenance", description: "Plumbing, electrical, HVAC, carpentry and general repairs.", icon: Wrench, group: "Services" },
  { id: "moving", label: "Moving & Delivery", description: "Home moves, item collection and last-mile delivery.", icon: Truck, group: "Services" },
  { id: "security", label: "Safety & Security", description: "Security professionals, smart security and safety equipment.", icon: ShieldCheck, group: "Services" },
];

const groups = ["All", "Shop", "Smart living", "Services"];

export default function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("All");

  const visibleCategories = useMemo(() => {
    const term = query.trim().toLowerCase();
    return categories.filter((category) => {
      const matchesGroup = activeGroup === "All" || category.group === activeGroup;
      const matchesSearch = !term || `${category.label} ${category.description}`.toLowerCase().includes(term);
      return matchesGroup && matchesSearch;
    });
  }, [activeGroup, query]);

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-black tracking-tight text-[#1A3C6E]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FACC15]"><Home size={19} /></span>
            AVIRITECH <span className="font-medium text-slate-500">Marketplace</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/dashboard/owner/maintenance" className="hidden font-semibold text-slate-600 hover:text-[#1A3C6E] sm:inline">Maintenance</Link>
            <Link href="/dashboard" className="rounded-xl bg-[#1A3C6E] px-4 py-2.5 font-bold text-white hover:bg-[#244b82]">My dashboard</Link>
          </nav>
        </div>
      </header>

      <section className="bg-[#1A3C6E] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_.8fr] md:items-center lg:px-8 lg:py-16">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#FACC15]">Home living, all in one place</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">Everything your home needs. One marketplace.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Discover household goods, smart-home technology, trusted skilled professionals and delivery services from one convenient destination.</p>
            <a href="#categories" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#FACC15] px-5 py-3 text-sm font-black text-slate-950 hover:bg-[#F5C518]">Explore marketplace <ArrowRight size={17} /></a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{icon:ShoppingBasket,title:"Shop essentials",desc:"Products for everyday living"},{icon:Lightbulb,title:"Smart home",desc:"IoT and connected devices"},{icon:Wrench,title:"Book professionals",desc:"Skills and home services"},{icon:Truck,title:"Get it delivered",desc:"Convenient home delivery"}].map((item) => {
              const Icon = item.icon;
              return <div key={item.title} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"><Icon className="text-[#FACC15]" size={23}/><p className="mt-4 text-sm font-extrabold">{item.title}</p><p className="mt-1 text-xs leading-5 text-blue-100">{item.desc}</p></div>;
            })}
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#1A3C6E]">Explore</p><h2 className="mt-1 text-2xl font-black">Browse by category</h2><p className="mt-1 text-sm text-slate-500">Products, connected-home solutions and services for your home.</p></div>
          <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:max-w-xs"><Search size={17} className="text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search categories" className="w-full bg-transparent text-sm outline-none"/></label>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {groups.map((group) => <button key={group} type="button" onClick={() => setActiveGroup(group)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${activeGroup === group ? "bg-[#1A3C6E] text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-[#1A3C6E]"}`}>{group}</button>)}
        </div>

        {visibleCategories.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCategories.map((category) => {
            const Icon = category.icon;
            return <article key={category.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#FACC15] hover:shadow-md">
              <div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FACC15]/20 text-[#1A3C6E]"><Icon size={22}/></span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{category.group}</span></div>
              <h3 className="mt-4 font-extrabold">{category.label}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">{category.description}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#1A3C6E]">Explore category <ChevronRight size={15}/></div>
            </article>;
          })}
        </div> : <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No categories match that search.</div>}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200"><div className="flex items-center gap-2 text-[#1A3C6E]"><Boxes size={20}/><p className="font-black">For merchants & service providers</p></div><p className="mt-2 text-sm leading-6 text-slate-500">Aviritech is building a shared marketplace for product merchants, IoT suppliers, delivery partners and skilled professionals.</p><Link href="/dashboard/vendor" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#1A3C6E]">Vendor workspace <ArrowRight size={16}/></Link></div>
          <div className="rounded-2xl bg-[#FFF8D9] p-6 ring-1 ring-[#FACC15]/40"><div className="flex items-center gap-2 text-slate-900"><ClipboardList size={20}/><p className="font-black">Need help with a property?</p></div><p className="mt-2 text-sm leading-6 text-slate-600">Go to your owner maintenance workspace to choose a property and continue with property-related maintenance.</p><Link href="/dashboard/owner/maintenance" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#1A3C6E]">Open maintenance <ArrowRight size={16}/></Link></div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Product listings, cart, checkout and delivery tracking will appear as the merchant commerce services are connected. No sample inventory or simulated purchases are shown.</p>
      </section>
    </main>
  );
}
