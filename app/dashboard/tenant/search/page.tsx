"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { Card } from "@/components/ui/Card";

type PropertyMedia = { url: string; thumbnailUrl: string | null };

type PropertySummary = {
  id: string;
  title: string;
  listingType: string;
  status: string;
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

type Inspection = {
  id: string;
  scheduledAt: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "MISSED";
  property: {
    id: string;
    title: string;
  };
};

type InspectionsMeResponse = {
  success: boolean;
  data: Inspection[];
};

function formatCurrency(amount: string, currency: string) {
  const value = Number(amount);
  const symbol = currency === "NGN" ? "₦" : currency;
  return `${symbol}${value.toLocaleString()}`;
}

export default function TenantSearchPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState<"ALL" | "RENT" | "SALE" | "SHORTLET">("ALL");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [page, setPage] = useState(1);

  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [inspectionStatusByProperty, setInspectionStatusByProperty] =
    useState<Record<string, Inspection["status"]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const loadInspectionStatuses = async () => {
      try {
        const res = await apiFetch<InspectionsMeResponse>(
          "/api/v1/inspections/me",
          getToken,
        );

        const statuses: Record<string, Inspection["status"]> = {};

        for (const inspection of res.data) {
          if (
            inspection.status === "PENDING" ||
            inspection.status === "CONFIRMED" ||
            inspection.status === "COMPLETED"
          ) {
            statuses[inspection.property.id] = inspection.status;
          }
        }

        setInspectionStatusByProperty(statuses);
      } catch {
        setInspectionStatusByProperty({});
      }
    };

    loadInspectionStatuses();
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const load = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({ page: String(page), limit: "12" });
        if (search.trim()) params.set("search", search.trim());
        if (listingType !== "ALL") params.set("listingType", listingType);
        if (minPrice) params.set("minPrice", minPrice);
        if (maxPrice) params.set("maxPrice", maxPrice);
        if (bedrooms) params.set("bedrooms", bedrooms);

        const res = await apiFetch<PropertyListResponse>(
          `/api/v1/properties?${params.toString()}`,
          getToken,
        );

        setProperties(res.data.properties);
        setPagination(res.data.pagination);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load properties",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLoaded, isSignedIn, getToken, router, search, listingType, minPrice, maxPrice, bedrooms, page]);

  return (
    <>
      <TopAppBar title="Marketplace" />

      <div className="mx-auto max-w-lg px-4 py-4">
        <div className="relative">
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

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
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

        <div className="mt-3 grid grid-cols-3 gap-2">
          <input
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value.replace(/\D/g, ""));
              setPage(1);
            }}
            placeholder="Min ₦"
            inputMode="numeric"
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs outline-none focus:border-brand-yellow"
          />
          <input
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value.replace(/\D/g, ""));
              setPage(1);
            }}
            placeholder="Max ₦"
            inputMode="numeric"
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs outline-none focus:border-brand-yellow"
          />
          <select
            value={bedrooms}
            onChange={(e) => {
              setBedrooms(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-black/10 bg-white px-2 py-2 text-xs outline-none focus:border-brand-yellow"
          >
            <option value="">Beds</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-black/40">Loading properties...</p>
        ) : error ? (
          <p className="mt-6 text-sm text-status-danger-fg">{error}</p>
        ) : properties.length === 0 ? (
          <Card className="mt-6 flex flex-col items-center gap-1 p-8 text-center">
            <p className="font-semibold">No properties found</p>
            <p className="text-sm text-black/50">
              Try adjusting your search or filters.
            </p>
          </Card>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {properties.map((property) => (
              <Link
                key={property.id}
                href={`/dashboard/tenant/properties/${property.id}`}
              >
                <Card className="overflow-hidden">
                  <div className="relative">
                    {property.media[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveMediaUrl(property.media[0].thumbnailUrl ?? property.media[0].url)}
                        alt=""
                        className="h-24 w-full object-cover"
                      />
                    ) : (
                      <div className="h-24 w-full bg-navy/5" />
                    )}

                    {(inspectionStatusByProperty[property.id] === "PENDING" ||
                      inspectionStatusByProperty[property.id] === "CONFIRMED" ||
                      inspectionStatusByProperty[property.id] === "COMPLETED") && (
                      <span className="absolute bottom-2 left-2 inline-flex items-center rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-[#277A59] shadow-sm backdrop-blur-sm">
                        {inspectionStatusByProperty[property.id] === "COMPLETED"
                          ? "Inspection Completed"
                          : "Inspection Booked"}
                      </span>
                    )}
                  </div>

                  <div className="p-2.5">
                    <p className="truncate text-xs font-semibold">
                      {property.title}
                    </p>
                    <p className="mt-0.5 text-xs font-bold">
                      {formatCurrency(property.price, property.currency)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-black/40">
                      {property.bedrooms ?? "—"} bd · {property.bathrooms ?? "—"} ba
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between">
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
    </>
  );
}
