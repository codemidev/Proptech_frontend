"use client";

import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

type PropertyMedia = { url: string; thumbnailUrl: string | null };

type PropertySummary = {
  id: string;
  title: string;
  listingType: string;
  price: string;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  media: PropertyMedia[];
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

type PropertyListResponse = {
  success: boolean;
  data: {
    properties: PropertySummary[];
    pagination: Pagination;
  };
};

function formatCurrency(amount: string, currency: string) {
  const value = Number(amount);
  const symbol = currency === "NGN" ? "₦" : currency;
  return `${symbol}${value.toLocaleString()}`;
}

function isListingType(value: string | null): value is "RENT" | "SALE" | "SHORTLET" {
  return value === "RENT" || value === "SALE" || value === "SHORTLET";
}

const CATEGORY_LABELS: Record<string, string> = {
  RESIDENTIAL: "Homes",
  COMMERCIAL: "Commercial",
  LAND: "Land",
  INDUSTRIAL: "Industrial",
  MIXED_USE: "Mixed Use",
  ESTATE: "Estate",
};

function PublicPropertiesContent() {
  const { isSignedIn } = useAuth();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState<"ALL" | "RENT" | "SALE" | "SHORTLET">(() => {
    const initial = searchParams.get("listingType");
    return isListingType(initial) ? initial : "ALL";
  });
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "");
  const [page, setPage] = useState(1);

  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({ page: String(page), limit: "12" });
        if (search.trim()) params.set("search", search.trim());
        if (listingType !== "ALL") params.set("listingType", listingType);
        if (category) params.set("category", category);

        const response = await fetch(
          `${API_URL}/api/v1/public/properties?${params.toString()}`,
        );

        const data: PropertyListResponse = await response.json();

        if (!response.ok) {
          throw new Error("Unable to load properties");
        }

        setProperties(data.data.properties);
        setPagination(data.data.pagination);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load properties");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [search, listingType, category, page]);

  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-white/90 px-6 py-4 backdrop-blur-md">
        <Logo size="sm" />

        <div className="flex items-center gap-3 text-sm font-medium">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-brand-yellow px-4 py-2 font-semibold text-black transition-colors hover:bg-brand-yellow-dark"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-black/70 transition-colors hover:text-black">
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full bg-brand-yellow px-4 py-2 font-semibold text-black transition-colors hover:bg-brand-yellow-dark"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold">Browse Properties</h1>
        <p className="mt-1 text-sm text-black/50">
          Explore available properties. Sign in to book an inspection or save a listing.
        </p>

        {category && (
          <button
            type="button"
            onClick={() => {
              setCategory("");
              setPage(1);
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-brand-yellow bg-brand-yellow/20 px-3.5 py-1.5 text-xs font-medium"
          >
            {CATEGORY_LABELS[category] ?? category} ×
          </button>
        )}

        <div className="relative mt-6 max-w-md">
          <SearchIcon
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search properties"
            className="w-full rounded-full border border-black/10 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-brand-yellow"
          />
        </div>

        <div className="mt-3 flex gap-2">
          {(["ALL", "RENT", "SALE", "SHORTLET"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setListingType(type);
                setPage(1);
              }}
              className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium ${
                listingType === type
                  ? "border-brand-yellow bg-brand-yellow/20 text-black"
                  : "border-black/10 bg-white text-black/60"
              }`}
            >
              {type === "ALL" ? "All Types" : type}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-black/40">Loading properties...</p>
        ) : error ? (
          <p className="mt-8 text-sm text-status-danger-fg">{error}</p>
        ) : properties.length === 0 ? (
          <Card className="mt-8 flex flex-col items-center gap-1 p-10 text-center">
            <p className="font-semibold">No properties found</p>
            <p className="text-sm text-black/50">Try a different search or filter.</p>
          </Card>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {properties.map((property) => (
              <Link key={property.id} href={`/properties/${property.id}`}>
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  {property.media[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(property.media[0].thumbnailUrl ?? property.media[0].url)}
                      alt=""
                      className="h-32 w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center bg-navy/5 text-xs text-black/30">
                      No image
                    </div>
                  )}

                  <div className="p-3">
                    <p className="truncate text-sm font-semibold">{property.title}</p>
                    <p className="mt-0.5 text-sm font-bold">
                      {formatCurrency(property.price, property.currency)}
                    </p>
                    <p className="mt-0.5 text-xs text-black/40">
                      {property.bedrooms ?? "—"} bd · {property.bathrooms ?? "—"} ba
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-black/50">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PublicPropertiesPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <PublicPropertiesContent />
    </Suspense>
  );
}
