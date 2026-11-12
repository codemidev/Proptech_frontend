"use client";

import { useEffect, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bath,
  BedDouble,
  ClipboardCheck,
  CreditCard,
  FileText,
  Heart,
  LogOut,
  Search,
  ShieldCheck,
  Wrench,
  Zap,
} from "lucide-react";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import { LoadingScreen } from "@/components/shell/LoadingScreen";
import { tenantBtn, tenantCard } from "@/components/tenant/ui";

type MeResponse = {
  success: boolean;
  data: {
    user: {
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
      email: string;
    };
  };
};

type PropertyMedia = { url: string; thumbnailUrl: string | null };

type PropertySummary = {
  id: string;
  title: string;
  slug: string;
  listingType: string;
  status: string;
  price: string;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  media: PropertyMedia[];
  landVault: {
    id: string;
    vaultCode: string;
    status: string;
  } | null;
};

type PropertyListResponse = {
  success: boolean;
  data: {
    properties: PropertySummary[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
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

const quickActions = [
  { href: "/dashboard/tenant/properties", label: "My Properties", icon: Heart, tint: "bg-[#FBE3E3]" },
  { href: "/dashboard/tenant/applications", label: "Applications", icon: FileText, tint: "bg-[#DCEAFB]" },
  { href: "/dashboard/tenant/payments", label: "Payments", icon: CreditCard, tint: "bg-[#DDF5E4]" },
  { href: "/dashboard/tenant/maintenance", label: "Maintenance", icon: Wrench, tint: "bg-[#FFF5CC]" },
  { href: "/dashboard/tenant/utilities", label: "Utilities", icon: Zap, tint: "bg-[#DDF5E4]" },
  { href: "/dashboard/tenant/inspections", label: "Inspections", icon: ClipboardCheck, tint: "bg-[#EDE7FB]" },
  { href: "/dashboard/tenant/search", label: "Marketplace", icon: ClipboardCheck, tint: "bg-[#FFF5CC]" },
  { href: "/dashboard/tenant/move-in", label: "Move-in", icon: ClipboardCheck, tint: "bg-[#FFF5CC]" },
];

function formatCurrency(amount: string, currency: string) {
  const value = Number(amount);
  const symbol = currency === "NGN" ? "₦" : currency;
  return `${symbol}${value.toLocaleString()}`;
}

export default function TenantDashboard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    setProfileMenuOpen(false);
    await signOut({ redirectUrl: "/sign-in" });
  };
  const [error, setError] = useState("");
  const [me, setMe] = useState<MeResponse["data"]["user"] | null>(null);

  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState<
    "ALL" | "RENT" | "SALE" | "SHORTLET" | "LANDVAULT"
  >("ALL");
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState("");
  const [propertiesReloadKey, setPropertiesReloadKey] = useState(0);
  const [inspectionStatusByProperty, setInspectionStatusByProperty] =
    useState<Record<string, Inspection["status"]>>({});

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const loadDashboard = async () => {
      try {
        const meRes = await apiFetch<MeResponse>("/api/v1/me", getToken);

        setMe(meRes.data.user);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load your dashboard",
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [isLoaded, isSignedIn, getToken, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const loadInspectionStatuses = async () => {
      try {
        const res = await apiFetch<InspectionsMeResponse>(
          "/api/v1/inspections/me",
          getToken,
        );

        const latestByProperty = new Map<string, Inspection>();

        for (const inspection of res.data) {
          const propertyId = inspection.property.id;
          const current = latestByProperty.get(propertyId);

          const incomingTime = Date.parse(inspection.scheduledAt);
          const currentTime = current
            ? Date.parse(current.scheduledAt)
            : Number.NEGATIVE_INFINITY;

          if (
            !current ||
            (Number.isFinite(incomingTime) &&
              (!Number.isFinite(currentTime) || incomingTime >= currentTime))
          ) {
            latestByProperty.set(propertyId, inspection);
          }
        }

        const statuses: Record<string, Inspection["status"]> = {};

        for (const [propertyId, inspection] of latestByProperty) {
          if (
            inspection.status === "PENDING" ||
            inspection.status === "CONFIRMED" ||
            inspection.status === "COMPLETED"
          ) {
            statuses[propertyId] = inspection.status;
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
    if (!isLoaded || !isSignedIn) return;

    let active = true;
    const timer = setTimeout(() => {
    const loadProperties = async () => {
      if (active) {
        setPropertiesLoading(true);
        setPropertiesError("");
      }

      try {
        const params = new URLSearchParams({ limit: "10" });

        if (
          listingType === "RENT" ||
          listingType === "SALE" ||
          listingType === "SHORTLET"
        ) {
          params.set("listingType", listingType);
        }

        if (listingType === "LANDVAULT") {
          params.set("landVault", "VERIFIED");
        }

        if (search.trim()) params.set("search", search.trim());

        const res = await apiFetch<PropertyListResponse>(
          `/api/v1/properties?${params.toString()}`,
          getToken,
        );

        if (active) setProperties(res.data.properties);
      } catch (err) {
        if (!active) return;
        setProperties([]);
        setPropertiesError(
          err instanceof Error ? err.message : "Unable to load properties."
        );
      } finally {
        if (active) setPropertiesLoading(false);
      }
    };

    void loadProperties();
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isLoaded, isSignedIn, getToken, search, listingType, propertiesReloadKey]);

  if (!isLoaded || loading) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p className="text-center text-status-danger-fg">{error}</p>
      </main>
    );
  }

  const initials = `${me?.firstName?.[0] ?? ""}${me?.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <main className="mx-auto max-w-lg px-5 pb-8 pt-6">
      {/* Welcome header */}
      <header className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 truncate text-2xl font-normal text-[#111827]">
          Welcome, {me?.firstName ?? "Tenant"}
        </h1>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-label="Open account menu"
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-navy text-sm font-semibold text-white ring-2 ring-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
          >
            {me?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              initials || "U"
            )}
          </button>

          {profileMenuOpen && (
            <div
              role="menu"
              aria-label="Account options"
              className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-black/5 bg-white p-2 shadow-xl"
            >
              <Link
                href="/dashboard/tenant/profile"
                role="menuitem"
                onClick={() => setProfileMenuOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm font-medium text-[#111827] hover:bg-gray-50"
              >
                Profile &amp; account settings
                <span className="mt-1 block text-xs font-normal text-[#667085]">
                  View your personal information
                </span>
              </Link>

              <div className="my-1 border-t border-gray-100" />

              <button
                type="button"
                role="menuitem"
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Search */}
      <div className="relative mt-4">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search for your next home"
          placeholder="Search for your next home..."
          className="w-full rounded-xl border border-[#E2E5E9] bg-white py-3 pl-10 pr-4 text-sm text-[#111827] outline-none placeholder:text-[#98A2B3] focus:border-[#111827]"
        />
      </div>

      {/* Quick actions */}
      <h2 className="dashboard-quick-actions-heading mt-6 text-[13px] font-medium text-[#111827]">
        Quick Actions
      </h2>

      <div className="tenant-quick-actions mt-3 grid grid-cols-2 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;

          const content = (
            <>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                <Icon
                  size={16}
                  aria-hidden="true"
                  className="text-[#111827]"
                />
              </span>

              <span className="!text-[#111111] text-xs">
                {action.label}
              </span>

            </>
          );

          const className = `dashboard-quick-action-card flex flex-col items-center justify-center gap-2 rounded-2xl py-4 text-center transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]/40 ${action.tint} active:scale-[0.98]`;

          return (
            <Link key={action.href} href={action.href} className={className}>
              {content}
            </Link>
          );
        })}
      </div>

      {/* Recommended */}
      <section className="tenant-recommended-section">
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-[#111827]">
          Recommended for you
        </h2>

        <Link
          href="/dashboard/tenant/search"
          className="text-xs text-[#667085] hover:text-[#111827]"
        >
          See all
        </Link>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {(["ALL", "RENT", "SALE", "SHORTLET", "LANDVAULT"] as const).map(
          (type) => (
            <button
              key={type}
              type="button"
              aria-pressed={listingType === type}
              onClick={() => setListingType(type)}
              className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11px] font-medium ${
                listingType === type
                  ? "border-[#FFE114] bg-[#FFE114] text-[#111827]"
                  : "border-[#E2E5E9] bg-white text-[#667085]"
              }`}
            >
              {type === "ALL"
                ? "All"
                : type === "RENT"
                  ? "Rent"
                  : type === "SALE"
                    ? "Sale"
                    : type === "SHORTLET"
                      ? "Shortlet"
                      : "LandVault"}
            </button>
          ),
        )}
      </div>

      {propertiesLoading ? (
        <p className="mt-4 text-sm text-[#667085]">
          Loading properties...
        </p>
      ) : propertiesError ? (
        <div role="alert" className={`${tenantCard} mt-4 p-4`}>
          <p className="text-sm text-[#B42318]">Unable to load properties.</p>
          <p className="mt-1 break-words text-xs text-[#667085]">{propertiesError}</p>
          <button
            type="button"
            onClick={() => {
              setPropertiesError("");
              setPropertiesReloadKey((value) => value + 1);
            }}
            className={tenantBtn("outline", "mt-3")}
          >
            Try again
          </button>
        </div>
      ) : properties.length === 0 ? (
        <p className="mt-4 text-sm text-[#667085]">
          No properties found.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/dashboard/tenant/properties/${property.id}`}
              className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]/40"
            >
              <article
                className={`${tenantCard} overflow-hidden transition-transform hover:-translate-y-0.5 active:scale-[0.99]`}
              >
                <div className="relative">
                  {property.media[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(
                        property.media[0].thumbnailUrl ??
                          property.media[0].url,
                      )}
                      alt=""
                      className="h-28 w-full object-cover"
                    />
                  ) : (
                    <div className="h-28 w-full bg-[#F5F6F7]" />
                  )}

                  {property.landVault?.status === "CERTIFIED" && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#111827]/90 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
                      <ShieldCheck size={12} aria-hidden="true" />
                      Verified
                    </span>
                  )}

                  {(inspectionStatusByProperty[property.id] === "PENDING" ||
                    inspectionStatusByProperty[property.id] === "CONFIRMED" ||
                    inspectionStatusByProperty[property.id] === "COMPLETED") && (
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-[#277A59] shadow-sm backdrop-blur-sm">
                      <ClipboardCheck size={11} aria-hidden="true" />
                      {inspectionStatusByProperty[property.id] === "COMPLETED"
                        ? "Inspection Completed"
                        : "Inspection Booked"}
                    </span>
                  )}
                </div>

                <div className="p-3">
                  <p className="truncate text-xs font-medium text-[#111827]">
                    {property.title}
                  </p>

                  <p className="mt-0.5 text-[13px] font-semibold text-[#111827]">
                    {formatCurrency(property.price, property.currency)}
                  </p>

                  {(property.bedrooms !== null ||
                    property.bathrooms !== null) && (
                    <p className="mt-1.5 flex items-center gap-3 text-[11px] text-[#667085]">
                      {property.bedrooms !== null && (
                        <span className="inline-flex items-center gap-1">
                          <BedDouble size={12} aria-hidden="true" />
                          {property.bedrooms}{" "}
                          {property.bedrooms === 1 ? "Bed" : "Beds"}
                        </span>
                      )}

                      {property.bathrooms !== null && (
                        <span className="inline-flex items-center gap-1">
                          <Bath size={12} aria-hidden="true" />
                          {property.bathrooms}{" "}
                          {property.bathrooms === 1 ? "Bath" : "Baths"}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
      </section>
    </main>
  );
}
