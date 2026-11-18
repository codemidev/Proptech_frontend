"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Building2, Search, SlidersHorizontal } from "lucide-react";
import { apiFetch } from "@/lib/api";

type MarketplaceProperty = {
  id: string;
  title: string;
  listingType: string;
  status: string;
  price: number | string;
  currency?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  propertyType?: { name?: string } | null;
  address?: {
    city?: string | null;
    state?: string | null;
    country?: string | null;
  } | null;
};

type MarketplaceResponse = {
  success: boolean;
  data: {
    properties: MarketplaceProperty[];
    pagination?: { total?: number; totalPages?: number };
  };
};

function formatPrice(property: MarketplaceProperty) {
  const amount = Number(property.price);
  if (!Number.isFinite(amount)) return "Price on request";
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: property.currency || "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${property.currency || "NGN"} ${amount.toLocaleString()}`;
  }
}

export default function MarketplacePage() {
  const [properties, setProperties] = useState<MarketplaceProperty[]>([]);
  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMarketplace() {
      try {
        setLoading(true);
        setError("");
        const response = await apiFetch<MarketplaceResponse>(
          "/api/v1/public/properties?page=1&limit=50",
          async () => null,
        );
        if (!cancelled) {
          setProperties(Array.isArray(response.data?.properties) ? response.data.properties : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load marketplace listings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMarketplace();
    return () => { cancelled = true; };
  }, []);

  const filteredProperties = useMemo(() => {
    const term = search.trim().toLowerCase();
    return properties.filter((property) => {
      const matchesType = !listingType || property.listingType === listingType;
      const searchable = [
        property.title,
        property.propertyType?.name,
        property.address?.city,
        property.address?.state,
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesType && (!term || searchable.includes(term));
    });
  }, [properties, search, listingType]);

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-slate-950">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard/owner" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
            <ArrowLeft size={16} /> Owner dashboard
          </Link>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">Aviritech Marketplace</span>
        </div>

        <div className="rounded-3xl bg-[#1A3C6E] px-6 py-8 text-white sm:px-10 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">Property marketplace</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Discover available properties</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
            Browse published properties currently available across the Aviritech network.
          </p>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:grid-cols-[1fr_220px]">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4">
            <Search size={17} className="text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by property, city or state" className="w-full bg-transparent py-3 text-sm outline-none" />
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4">
            <SlidersHorizontal size={16} className="text-slate-400" />
            <select value={listingType} onChange={(event) => setListingType(event.target.value)} className="w-full bg-transparent py-3 text-sm outline-none">
              <option value="">All listing types</option>
              <option value="RENT">For rent</option>
              <option value="LEASE">For lease</option>
              <option value="SHORTLET">Shortlet</option>
              <option value="SALE">For sale</option>
            </select>
          </label>
        </div>

        <div className="mb-4 mt-7 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">Available listings</h2>
          <span className="text-xs font-medium text-slate-500">{loading ? "Loading…" : `${filteredProperties.length} properties`}</span>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl bg-white ring-1 ring-slate-100" />)}</div>
        ) : filteredProperties.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-100">
            <Building2 className="mx-auto text-slate-300" size={32} />
            <h3 className="mt-3 font-bold">No matching properties</h3>
            <p className="mt-1 text-sm text-slate-500">Try a different search or listing type. New published listings will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((property) => (
              <article key={property.id} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-800">{property.listingType.replaceAll("_", " ")}</span>
                  <span className="text-xs text-slate-400">{property.propertyType?.name || "Property"}</span>
                </div>
                <h3 className="mt-4 text-lg font-black">{property.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{[property.address?.city, property.address?.state].filter(Boolean).join(", ") || "Location available on details"}</p>
                <p className="mt-4 text-xl font-black text-[#1A3C6E]">{formatPrice(property)}</p>
                <p className="mt-2 text-xs text-slate-500">{property.bedrooms ?? "—"} bedrooms <span className="px-1">·</span> {property.bathrooms ?? "—"} bathrooms</p>
                <Link href={`/properties/${encodeURIComponent(property.id)}`} className="mt-5 inline-flex items-center justify-between rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-[#F5C518]">
                  View property <ArrowUpRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
