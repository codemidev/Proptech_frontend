"use client";

import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type PropertySummary = {
  id: string;
  title: string;
  address: { addressLine1: string } | null;
};

type PropertyResponse = { success: boolean; data: PropertySummary };

function toLocalDateTimeInputMin() {
  const now = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function BookInspectionContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = searchParams.get("propertyId");

  const [property, setProperty] = useState<PropertySummary | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    if (!propertyId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingProperty(false);
      return;
    }

    const load = async () => {
      try {
        const res = await apiFetch<PropertyResponse>(
          `/api/v1/properties/${propertyId}`,
          getToken,
        );
        setProperty(res.data);
      } catch {
        setProperty(null);
      } finally {
        setLoadingProperty(false);
      }
    };

    load();
  }, [isLoaded, isSignedIn, getToken, router, propertyId]);

  const handleSubmit = async () => {
    if (!propertyId || !scheduledAt) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch<{
        success: boolean;
        data: {
          paymentLink: string;
          reference: string;
          amount: number;
          currency: string;
          inspectionId: string;
        };
      }>("/api/v1/payments/inspection/initialize", getToken, {
        method: "POST",
        body: JSON.stringify({
          propertyId,
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      });

      window.location.href = res.data.paymentLink;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to start inspection payment",
      );
      setSubmitting(false);
    }
  };

  if (loadingProperty) {
    return (
      <>
        <TopAppBar title="Book Inspection" />
        <p className="px-4 py-8 text-center text-sm text-black/40">Loading...</p>
      </>
    );
  }

  if (!propertyId || !property) {
    return (
      <>
        <TopAppBar title="Book Inspection" />
        <p className="px-4 py-8 text-center text-sm text-status-danger-fg">
          Property not found.
        </p>
      </>
    );
  }

  return (
    <>
      <TopAppBar title="Book Inspection" />
      <div className="mx-auto max-w-lg px-4 py-4">
        <Card className="p-4">
          <p className="text-xs text-black/50">Property</p>
          <p className="mt-1 font-semibold">{property.title}</p>
          {property.address && (
            <p className="mt-0.5 text-xs text-black/50">
              {property.address.addressLine1}
            </p>
          )}
        </Card>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-black/60">
            Select date &amp; time
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            min={toLocalDateTimeInputMin()}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-brand-yellow"
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-status-danger-fg">{error}</p>
        )}

        <Button
          className="mt-5"
          onClick={handleSubmit}
          disabled={!scheduledAt || submitting}
        >
          {submitting ? "Starting Payment..." : "Continue to Payment"}
        </Button>
      </div>
    </>
  );
}

export default function BookInspectionPage() {
  return (
    <Suspense
      fallback={
        <>
          <TopAppBar title="Book Inspection" />
          <p className="px-4 py-8 text-center text-sm text-black/40">Loading...</p>
        </>
      }
    >
      <BookInspectionContent />
    </Suspense>
  );
}
