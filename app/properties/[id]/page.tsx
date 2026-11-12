"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Bed, Bath, Ruler } from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
  buildingSize: string | null;
  measurementUnit: string | null;
  address: { addressLine1: string; landmark: string | null } | null;
  amenities: { amenity: { id: string; name: string } }[];
  features: { feature: { id: string; name: string } }[];
  media: { url: string; thumbnailUrl: string | null }[];
};

type PropertyDetailResponse = { success: boolean; data: PropertyDetail };

function formatCurrency(amount: string, currency: string) {
  const value = Number(amount);
  const symbol = currency === "NGN" ? "₦" : currency;
  return `${symbol}${value.toLocaleString()}`;
}

const availableStatuses = ["AVAILABLE", "ACTIVE"];

export default function PublicPropertyDetailPage() {
  const { isSignedIn } = useAuth();
  const params = useParams<{ id: string }>();

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const rawReferral = new URLSearchParams(window.location.search).get("ref");

    if (rawReferral && /^[A-Z0-9]{6,20}$/i.test(rawReferral)) {
      setReferralCode(rawReferral.toUpperCase());
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/public/properties/${params.id}`);
        const data: PropertyDetailResponse = await response.json();

        if (!response.ok) {
          throw new Error("This property is unavailable");
        }

        setProperty(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load this property");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [params.id]);

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white pb-10">
      <header className="flex items-center gap-3 border-b border-black/5 px-4 py-4">
        <Link href="/properties" aria-label="Back to listings" className="rounded-full p-1 hover:bg-black/5">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-base font-semibold">Property</h1>
      </header>

      {loading ? (
        <p className="px-4 py-8 text-center text-sm text-black/40">Loading...</p>
      ) : error || !property ? (
        <p className="px-4 py-8 text-center text-sm text-status-danger-fg">
          {error || "Property not found"}
        </p>
      ) : (
        <>
          {property.media[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveMediaUrl(property.media[0].thumbnailUrl ?? property.media[0].url)}
              alt=""
              className="h-64 w-full object-cover"
            />
          ) : (
            <div className="h-64 w-full bg-navy/5" />
          )}

          <div className="px-4 pt-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">{property.title}</h2>
                {property.address && (
                  <p className="mt-0.5 text-sm text-black/50">
                    {property.address.addressLine1}
                    {property.address.landmark ? `, ${property.address.landmark}` : ""}
                  </p>
                )}
              </div>
              <StatusPill tone={availableStatuses.includes(property.status) ? "success" : "pending"}>
                {property.status}
              </StatusPill>
            </div>

            <p className="mt-3 text-2xl font-bold">
              {formatCurrency(property.price, property.currency)}
              {property.listingType === "RENT" && (
                <span className="text-sm font-normal text-black/40">/year</span>
              )}
            </p>

            <div className="mt-4 flex gap-5 text-sm text-black/60">
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
              <p className="mt-4 text-sm text-black/70">{property.description}</p>
            )}

            {property.amenities.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold text-black/50">AMENITIES</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {property.amenities.map(({ amenity }) => (
                    <span key={amenity.id} className="rounded-full bg-black/5 px-3 py-1 text-xs">
                      {amenity.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {property.features.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-black/50">FEATURES</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {property.features.map(({ feature }) => (
                    <span key={feature.id} className="rounded-full bg-black/5 px-3 py-1 text-xs">
                      {feature.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isSignedIn ? (
              <Link href={`/dashboard/tenant/inspections/new?propertyId=${property.id}`}>
                <Button className="mt-6">Book Inspection</Button>
              </Link>
            ) : (
              <div className="mt-6 space-y-2">
                <Link href={referralCode ? `/sign-in?ref=${encodeURIComponent(referralCode)}` : "/sign-in"}>
                  <Button>Sign In to Book an Inspection</Button>
                </Link>
                <Link href={referralCode ? `/sign-up?ref=${encodeURIComponent(referralCode)}` : "/sign-up"}>
                  <Button variant="secondary">Create an Account</Button>
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
