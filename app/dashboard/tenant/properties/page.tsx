"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { TenantPill, tenantBtn, tenantCard } from "@/components/tenant/ui";

type Lease = {
  id: string;
  leaseNumber: string;
  status: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  property: {
    id: string;
    title: string;
    slug: string;
    currency: string;
    media: { url: string; thumbnailUrl: string | null }[];
    address?: { addressLine1: string } | null;
  };
};

function date(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString(undefined, {
        day: "2-digit", month: "short", year: "numeric",
      });
}

function money(value: string, currency: string) {
  const amount = Number(value);
  const symbol = currency === "NGN" ? "₦" : `${currency} `;
  return Number.isFinite(amount)
    ? `${symbol}${amount.toLocaleString()}`
    : `${symbol}${value}`;
}

export default function TenantPropertiesPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await apiFetch<{ success: boolean; data: Lease[] | null }>(
          "/api/v1/leases/me/confirmed", getToken,
        );
        if (!cancelled) setLeases(response.data ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load your rentals.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken, router]);

  return (
    <>
      <TopAppBar title="My Properties" />
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-28 pt-5">
        <section>
          <h1 className="text-lg font-semibold text-[#111827]">My Rentals</h1>
          <p className="mt-1 text-sm text-[#667085]">
            Rentals with confirmed rent payment and your accepted contract.
          </p>

          {loading ? (
            <div className={`${tenantCard} mt-3 animate-pulse p-5`}>
              <div className="h-4 w-2/5 rounded bg-[#F1F2F4]" />
              <div className="mt-3 h-3 w-3/5 rounded bg-[#F1F2F4]" />
              <div className="mt-6 h-10 rounded bg-[#F1F2F4]" />
            </div>
          ) : error ? (
            <div className={`${tenantCard} mt-3 p-5`}>
              <p className="text-sm text-[#B42318]">{error}</p>
              <button onClick={() => router.refresh()} className="mt-3 text-sm font-semibold underline">
                Retry
              </button>
            </div>
          ) : leases.length > 0 ? (
            <div className="mt-3 space-y-4">
              {leases.map((lease) => (
                <article key={lease.id} className={`${tenantCard} overflow-hidden`}>
                  {lease.property.media?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(
                        lease.property.media[0].thumbnailUrl ?? lease.property.media[0].url
                      )}
                      alt={lease.property.title}
                      className="h-48 w-full object-cover"
                    />
                  )}
                  <div className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-[#111827]">{lease.property.title}</h2>
                        {lease.property.address?.addressLine1 && (
                          <p className="mt-1 text-sm text-[#667085]">
                            {lease.property.address.addressLine1}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-[#667085]">Lease {lease.leaseNumber}</p>
                      </div>
                      <TenantPill tone="success">{lease.status.toUpperCase()}</TenantPill>
                    </div>
                    <div className="grid gap-3 rounded-xl bg-[#F8F9FA] p-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-[#667085]">Lease Term</p>
                        <p className="mt-1 text-sm font-medium text-[#111827]">
                          {date(lease.startDate)} — {date(lease.endDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#667085]">Rent Amount</p>
                        <p className="mt-1 text-lg font-semibold text-[#111827]">
                          {money(lease.rentAmount, lease.property.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <p className="flex-1 self-center text-sm leading-5 text-[#667085]">
                        Rent and contract are confirmed.
                      </p>
                      <Link
                        href={`/dashboard/tenant/move-in?leaseId=${encodeURIComponent(lease.id)}`}
                        className={tenantBtn("outline", "flex-1")}
                      >
                        Move-in & Key Handover
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={`${tenantCard} mt-3 p-6 text-center`}>
              <h2 className="font-semibold text-[#111827]">No Confirmed Rentals</h2>
              <p className="mt-2 text-sm text-[#667085]">
                Rentals appear here only after rent is confirmed and you have accepted the contract.
                If an application is in progress, check Applications and Payments for the next step.
              </p>
              <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                <Link href="/dashboard/tenant/applications" className={tenantBtn("primary")}>
                  View Applications
                </Link>
                <Link href="/dashboard/tenant/payments" className={tenantBtn("outline")}>
                  View Payments
                </Link>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">Saved Properties</h2>
          <div className={`${tenantCard} mt-3 p-5`}>
            <p className="text-sm leading-5 text-[#667085]">
              Saved listings are not connected yet. Browse the marketplace to explore properties.
            </p>
            <Link href="/dashboard/tenant/search" className={tenantBtn("outline", "mt-4")}>
              Browse Marketplace
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
