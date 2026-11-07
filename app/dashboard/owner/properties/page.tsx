"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState, ComponentProps } from "react";

import { apiFetch } from "@/lib/api";
import {
  getPropertyActions,
  ownerPropertyRoutes,
  PROPERTY_ACTION_META,
  type PropertyAction,
} from "@/lib/property-actions";
import { PropertyImages } from "@/components/owner/PropertyImages";
import { MaintenanceServicesModal } from "@/components/owner/MaintenanceServicesModal";
import { LoadingScreen } from "@/components/shell/LoadingScreen";

type Property = {
  id: string;
  propertyCode: string;
  title: string;
  listingType: string;
  status: string;
  price: number | string;
  currency?: string;
  published?: boolean;
  verified?: boolean;
  propertyTypeId: string;
  propertyType?: {
    id?: string;
    name?: string;
  } | null;
  agentId?: string | null;
  landVault?: {
    id: string;
    vaultCode: string;
    status: string;
  } | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  toilets?: number | null;
  media?: unknown[];
  address?: {
    city?: string | null;
    state?: string | null;
    country?: string | null;
    addressLine1?: string | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

type PropertyType = {
  id: string;
  name: string;
};

type PropertiesResponse = {
  success: boolean;
  data: {
    properties: Property[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

type PropertyTypeResponse = {
  success: boolean;
  data: PropertyType[];
};

type UpdateResponse = {
  success: boolean;
  message?: string;
  data: Property;
};

type SubmitResponse = {
  success: boolean;
  message?: string;
  data: Property;
};

type DeleteResponse = {
  success: boolean;
  message?: string;
};

function formatMoney(
  amount: number | string,
  currency = "NGN",
) {
  const numeric = Number(amount);

  if (!Number.isFinite(numeric)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${currency} ${numeric.toLocaleString()}`;
  }
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function statusClass(status: string) {
  switch (status) {
    case "ACTIVE":
    case "AVAILABLE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "PENDING_APPROVAL":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "REJECTED":
    case "SUSPENDED":
      return "bg-red-50 text-red-700 ring-red-200";

    case "DRAFT":
      return "bg-slate-100 text-slate-700 ring-slate-200";

    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export default function MyPropertiesPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const [properties, setProperties] = useState<Property[]>([]);
  const [maintenanceProperty, setMaintenanceProperty] = useState<{ id: string; title: string } | null>(null);
  const [propertyTypes, setPropertyTypes] =
    useState<PropertyType[]>([]);

  const [page, setPage] = useState(1);

  const [pagination, setPagination] =
    useState<PropertiesResponse["data"]["pagination"] | null>(
      null,
    );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [listingTypeFilter, setListingTypeFilter] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  async function loadProperties() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (listingTypeFilter) {
        params.set("listingType", listingTypeFilter);
      }

      const response =
        await apiFetch<PropertiesResponse>(
          `/api/v1/properties?${params.toString()}`,
          getToken,
        );

      console.log(
        "[PROPERTIES_API_DIAGNOSTIC]",
        {
          success: response.success,
          propertyCount: Array.isArray(response.data?.properties)
            ? response.data.properties.length
            : "NOT_ARRAY",
          properties: response.data?.properties ?? null,
          pagination: response.data?.pagination ?? null,
        },
      );

      setProperties(response.data.properties);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your properties.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPropertyTypes() {
    try {
      const response =
        await apiFetch<PropertyTypeResponse>(
          "/api/v1/property-types",
          getToken,
        );

      setPropertyTypes(response.data ?? []);
    } catch {
      /*
       * Optional lookup.
       * Existing property data remains usable if this fails.
       */
    }
  }

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    loadProperties();
  }, [
    isLoaded,
    isSignedIn,
    page,
    search,
    statusFilter,
    listingTypeFilter,
  ]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    loadPropertyTypes();
  }, [isLoaded, isSignedIn]);
  async function handleDeleteProperty(
    propertyId: string,
    propertyTitle: string,
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${propertyTitle}"?\n\nThis property will be archived.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(propertyId);
      setError("");
      setSuccess("");

      const response =
        await apiFetch<DeleteResponse>(
          `/api/v1/properties/${propertyId}`,
          getToken,
          {
            method: "DELETE",
          },
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Failed to delete property.",
        );
      }

      setProperties((current) =>
        current.filter(
          (property) => property.id !== propertyId,
        ),
      );

      setSuccess("Property archived successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete property.",
      );
    } finally {
      setDeletingId(null);
    }
  }


  if (!isLoaded || !isSignedIn) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-slate-950">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Property Management
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight">
              My Properties
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Manage your listings, update property information,
              upload media, and submit completed properties for
              administrative approval.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/dashboard/owner"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:bg-slate-50"
            >
              <span aria-hidden="true">←</span>
              Back to Owner Dashboard
            </Link>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/dashboard/owner/properties/new";
              }}
              className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-yellow-300"
            >
              + Add Property
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">

            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search your properties..."
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-400"
            />

            <select
              value={listingTypeFilter}
              onChange={(event) => {
                setPage(1);
                setListingTypeFilter(event.target.value);
              }}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-400"
            >
              <option value="">All listing types</option>
              <option value="RENT">Rent</option>
              <option value="LEASE">Lease</option>
              <option value="SHORTLET">Shortlet</option>
              <option value="SALE">Sale</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-400"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">
                Pending approval
              </option>
              <option value="ACTIVE">Active</option>
              <option value="AVAILABLE">Available</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
            </select>

          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
            <p className="text-sm font-medium text-slate-500">
              Loading your properties...
            </p>
          </div>
        ) : properties.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-100">
            <h2 className="text-xl font-black">
              No properties found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Add your first property to start managing your
              listings from one place.
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/dashboard/owner/properties/new";
              }}
              className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
            >
              Add your first property
            </button>
          </div>
        ) : (
          <div className="space-y-5">

            {properties.map((property) => {
              const isLandVault = Boolean(property.landVault);
              const isPending =
                property.status === "PENDING_APPROVAL";

              const isDeleting =
                deletingId === property.id;

              return (
                <article
                  key={property.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100"
                >
                  <div className="p-5 sm:p-6">


                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                          <div>
                            <div className="flex flex-wrap items-center gap-2">

                              <h2 className="text-xl font-black">
                                {property.title}
                              </h2>

                              {isLandVault && (
                                <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-yellow-800 ring-1 ring-yellow-300">
                                  LANDVAULT
                                </span>
                              )}

                              {property.published && (
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                                  LIVE
                                </span>
                              )}

                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ring-1 ${statusClass(
                                  property.status,
                                )}`}
                              >
                                {statusLabel(
                                  property.status,
                                )}
                              </span>

                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {property.propertyCode}
                            </p>

                            {isLandVault && property.landVault?.vaultCode && (
                              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-yellow-700">
                                Vault {property.landVault.vaultCode}
                              </p>
                            )}

                            {isLandVault && property.landVault?.id && (
                              <Link
                                href={`/dashboard/owner/land-vault/${encodeURIComponent(property.landVault.id)}`}
                                className="mt-3 inline-flex rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-yellow-300"
                              >
                                View LandVault
                              </Link>
                            )}
                          </div>

                          <div className="text-left md:text-right">

                            <p className="text-lg font-black">
                              {formatMoney(
                                property.price,
                                property.currency,
                              )}
                            </p>

                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                              {property.listingType}
                            </p>

                          </div>

                        </div>

                        {!isLandVault && (
                          <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-4">

                          <div>
                            <p className="text-slate-400">
                              Property type
                            </p>

                            <p className="mt-1 font-semibold">
                              {property.propertyType?.name ??
                                "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">
                              Bedrooms
                            </p>

                            <p className="mt-1 font-semibold">
                              {property.bedrooms ?? "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">
                              Bathrooms
                            </p>

                            <p className="mt-1 font-semibold">
                              {property.bathrooms ?? "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">
                              Location
                            </p>

                            <p className="mt-1 truncate font-semibold">
                              {property.address?.city ??
                                property.address?.state ??
                                "—"}
                            </p>
                          </div>

                          </div>
                        )}

                        <div className="mt-5">
                          <PropertyImages
                            propertyId={property.id}
                            media={
                              (property.media ?? []) as ComponentProps<
                                typeof PropertyImages
                              >["media"]
                            }
                            getToken={getToken}
                            onChange={loadProperties}
                          />
                        </div>

                        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">

                          {getPropertyActions(property.listingType).map(
                            (action: PropertyAction) => {
                              const isEdit = action === "edit";
                              const disabled =
                                isEdit && isPending;

                              return (
                                <button
                                  key={action}
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => {
                                                    if (disabled) {
                                                      return;
                                                    }

                                                    if (action === "maintenance") {
                                                      setMaintenanceProperty({
                                                        id: property.id,
                                                        title: property.title,
                                                      });
                                                      return;
                                                    }

                                                    window.location.href =
                                                      ownerPropertyRoutes[action](
                                                        property.id,
                                                      );
                                                  }}
                                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {isEdit && isPending
                                    ? "Under Review"
                                    : PROPERTY_ACTION_META[action].label}
                                </button>
                              );
                            },
                          )}

                          <button
                            type="button"
                            disabled={
                              isDeleting || isPending
                            }
                            onClick={() =>
                              handleDeleteProperty(
                                property.id,
                                property.title,
                              )
                            }
                            className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isDeleting
                              ? "Deleting..."
                              : "Delete"}
                          </button>

                        </div>
                  </div>
                </article>
              );
            })}

          </div>
        )}

        {pagination &&
          pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">

              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) =>
                    Math.max(1, current - 1),
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Previous
              </button>

              <p className="text-sm font-semibold text-slate-500">
                Page {pagination.page} of{" "}
                {pagination.totalPages}
              </p>

              <button
                type="button"
                disabled={
                  page >= pagination.totalPages
                }
                onClick={() =>
                  setPage((current) =>
                    Math.min(
                      pagination.totalPages,
                      current + 1,
                    ),
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Next
              </button>

            </div>
          )}

      </section>

    <MaintenanceServicesModal
      open={maintenanceProperty !== null}
      propertyId={maintenanceProperty?.id ?? ""}
      propertyName={maintenanceProperty?.title ?? "Property"}
      onClose={() => setMaintenanceProperty(null)}
    />
    </main>
  );
}
