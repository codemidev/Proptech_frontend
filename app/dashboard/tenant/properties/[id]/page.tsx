"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Bed, Bath, Ruler } from "lucide-react";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";

type PropertyDetail = {
  id: string;
  title: string;
  description: string | null;
  listingType: string;
  status: string;
  price: string;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  toilets: number | null;
  parkingSpaces: number | null;
  landSize: string | null;
  buildingSize: string | null;
  measurementUnit: string | null;
  propertyType: { name: string } | null;
  owner: { firstName: string | null; lastName: string | null; email: string } | null;
  agent: { firstName: string | null; lastName: string | null; email: string } | null;
  address: {
    addressLine1: string;
    addressLine2: string | null;
    landmark: string | null;
  } | null;
  amenities: { amenity: { id: string; name: string } }[];
  features: { feature: { id: string; name: string } }[];
  media: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    type?: string;
    caption?: string | null;
    isFeatured?: boolean;
  }[];
  coordinates: {
    latitude: string | number;
    longitude: string | number;
    pointOrder: number;
  }[];
};

type PropertyDetailResponse = {
  success: boolean;
  data: PropertyDetail;
};

function formatCurrency(amount: string, currency: string) {
  const value = Number(amount);
  const symbol = currency === "NGN" ? "₦" : currency;
  return `${symbol}${value.toLocaleString()}`;
}

const availableStatuses = ["AVAILABLE", "ACTIVE"];

const TenantPropertyMap = dynamic(
  () => import("@/components/tenant/TenantPropertyMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
    ),
  },
);

export default function PropertyDetailPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const load = async () => {
      try {
        const res = await apiFetch<PropertyDetailResponse>(
          `/api/v1/properties/${params.id}`,
          getToken,
        );
        setProperty(res.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load this property",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLoaded, isSignedIn, getToken, router, params.id]);

  if (loading) {
    return (
      <>
        <TopAppBar title="Property" />
        <p className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">Loading...</p>
      </>
    );
  }

  if (error || !property) {
    return (
      <>
        <TopAppBar title="Property" />
        <p className="px-4 py-8 text-center text-sm text-status-danger-fg">
          {error || "Property not found"}
        </p>
      </>
    );
  }

  const isBookable = availableStatuses.includes(property.status);

  const galleryMedia = property.media.filter(
    (item) => !item.type || item.type === "IMAGE" || item.type === "VIDEO",
  );
  const activeMedia = galleryMedia[activeMediaIndex] ?? galleryMedia[0];

  const firstCoordinate = property.coordinates?.[0];
  const latitude = Number(firstCoordinate?.latitude);
  const longitude = Number(firstCoordinate?.longitude);
  const hasMapPin =
    Boolean(firstCoordinate) &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  return (
    <>
      <TopAppBar title="Property" />

      <div className="mx-auto max-w-lg pb-8">
        <section className="bg-[var(--surface-muted)]">
          {activeMedia ? (
            activeMedia.type === "VIDEO" ? (
              <video
                key={activeMedia.id}
                src={resolveMediaUrl(activeMedia.url)}
                controls
                playsInline
                preload="metadata"
                className="h-64 w-full bg-black object-contain sm:h-72"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={activeMedia.id}
                src={resolveMediaUrl(activeMedia.thumbnailUrl ?? activeMedia.url)}
                alt={activeMedia.caption ?? property.title}
                className="h-64 w-full object-cover sm:h-72"
              />
            )
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--muted-foreground)] sm:h-72">
              No property photos or video available
            </div>
          )}

          {galleryMedia.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {galleryMedia.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveMediaIndex(index)}
                  aria-label={`Show property media ${index + 1}`}
                  aria-pressed={activeMedia?.id === item.id}
                  className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                    activeMedia?.id === item.id
                      ? "border-yellow-400"
                      : "border-[var(--border)]"
                  }`}
                >
                  {item.type === "VIDEO" ? (
                    <video
                      src={resolveMediaUrl(item.url)}
                      muted
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(item.thumbnailUrl ?? item.url)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="px-4 pt-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold">{property.title}</h1>
              {property.address && (
                <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                  {property.address.addressLine1}
                  {property.address.landmark ? `, ${property.address.landmark}` : ""}
                </p>
              )}
            </div>
            <StatusPill tone={isBookable ? "success" : "pending"}>
              {property.status}
            </StatusPill>
          </div>

          <p className="mt-3 text-2xl font-bold">
            {formatCurrency(property.price, property.currency)}
            {property.listingType === "RENT" && (
              <span className="text-sm font-normal text-[var(--muted-foreground)]">/year</span>
            )}
          </p>

          <div className="mt-4 flex gap-5 text-sm text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1.5">
              <Bed size={16} /> {property.bedrooms ?? "—"} Bed
            </span>
            <span className="flex items-center gap-1.5">
              <Bath size={16} /> {property.bathrooms ?? "—"} Bath
            </span>
            {property.buildingSize && (
              <span className="flex items-center gap-1.5">
                <Ruler size={16} /> {property.buildingSize} {property.measurementUnit}
              </span>
            )}
          </div>

          {property.description && (
            <p className="mt-4 text-sm text-[var(--foreground)]">{property.description}</p>
          )}

          {hasMapPin && (
            <section className="mt-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="p-3">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Property location
                </h2>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Map pin from the property's saved location coordinates
                </p>
              </div>
              <TenantPropertyMap latitude={latitude} longitude={longitude} />
            </section>
          )}

          {property.amenities.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">AMENITIES</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {property.amenities.map(({ amenity }) => (
                  <span
                    key={amenity.id}
                    className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs"
                  >
                    {amenity.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {property.features.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">FEATURES</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {property.features.map(({ feature }) => (
                  <span
                    key={feature.id}
                    className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs"
                  >
                    {feature.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(property.owner || property.agent) && (
            <Card className="mt-5 p-4">
              <p className="text-xs text-[var(--muted-foreground)]">Listed by</p>
              <p className="mt-1 text-sm font-semibold">
                {property.agent
                  ? `${property.agent.firstName ?? ""} ${property.agent.lastName ?? ""}`.trim() || property.agent.email
                  : `${property.owner?.firstName ?? ""} ${property.owner?.lastName ?? ""}`.trim() || property.owner?.email}
              </p>
            </Card>
          )}

          {isBookable ? (
            <Link href={`/dashboard/tenant/inspections/new?propertyId=${property.id}`}>
              <Button className="mt-6">Book Inspection</Button>
            </Link>
          ) : (
            <Button className="mt-6" disabled>
              Not Currently Available
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
