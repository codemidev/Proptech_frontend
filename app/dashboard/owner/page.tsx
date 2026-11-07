"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { apiFetch } from "@/lib/api";

import { HandoverManagement } from "@/components/owner/HandoverManagement";
import { LoadingScreen } from "@/components/shell/LoadingScreen";
import { OwnerDashboardUI } from "@/components/owner/OwnerDashboardUI";

type DashboardStats = {
  totalProperties: number;
  activeListings: number;
  rentableProperties: number;
  occupied: number;
};

type OwnerDashboardPayment = NonNullable<
  ComponentProps<typeof OwnerDashboardUI>["recentPayments"]
>[number];

type PaymentsResponse = {
  success: boolean;
  data: {
    payments: OwnerDashboardPayment[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

type PropertiesResponse = {
  success: boolean;
  data: {
    properties: unknown[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    stats: DashboardStats;
  };
};

type OwnerInspection = {
  id: string;
  scheduledAt: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "MISSED";
  property: {
    id: string;
    title: string;
    address?: {
      addressLine1?: string | null;
      city?: string | null;
      state?: string | null;
    } | null;
  };
  inspector?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  booking?: {
    id: string;
    reference: string;
    status: string;
    startDate: string;
    customer?: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null;
  } | null;
};

type OwnerInspectionsResponse = {
  success: boolean;
  data: OwnerInspection[];
};

export default function OwnerDashboardPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  const [dashboardStats, setDashboardStats] =
    useState<DashboardStats | null>(null);

  const [recentPayments, setRecentPayments] =
    useState<OwnerDashboardPayment[]>([]);

  const [paymentsLoading, setPaymentsLoading] =
    useState(true);

  const [paymentsError, setPaymentsError] =
    useState("");

  const [inspectionRequests, setInspectionRequests] =
    useState<OwnerInspection[]>([]);

  const [inspectionRequestsLoading, setInspectionRequestsLoading] =
    useState(true);

  const [inspectionRequestsError, setInspectionRequestsError] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        /*
         * Only one lightweight property request is made here.
         *
         * The dashboard needs statistics, not the owner's property
         * management collection.
         */
        const response =
          await apiFetch<PropertiesResponse>(
            "/api/v1/properties?page=1&limit=1",
            getToken,
          );

        if (!cancelled) {
          setDashboardStats(response.data.stats);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your dashboard.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;

    async function loadPayments() {
      try {
        setPaymentsLoading(true);
        setPaymentsError("");

        const response =
          await apiFetch<PaymentsResponse>(
            "/api/v1/payments/me",
            getToken,
          );

        if (!cancelled) {
          setRecentPayments(
            Array.isArray(response.data)
              ? response.data.slice(0, 5)
              : [],
          );
        }
      } catch (err) {
        if (!cancelled) {
          setPaymentsError(
            err instanceof Error
              ? err.message
              : "Unable to load payment activity.",
          );
        }
      } finally {
        if (!cancelled) {
          setPaymentsLoading(false);
        }
      }
    }

    loadPayments();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;

    async function loadInspectionRequests() {
      try {
        setInspectionRequestsLoading(true);
        setInspectionRequestsError("");

        const response =
          await apiFetch<OwnerInspectionsResponse>(
            "/api/v1/inspections/owner",
            getToken,
          );

        if (!cancelled) {
          setInspectionRequests(
            Array.isArray(response.data)
              ? response.data
              : [],
          );
        }
      } catch (err) {
        if (!cancelled) {
          setInspectionRequests([]);
          setInspectionRequestsError(
            err instanceof Error
              ? err.message
              : "Unable to load inspection requests.",
          );
        }
      } finally {
        if (!cancelled) {
          setInspectionRequestsLoading(false);
        }
      }
    }

    loadInspectionRequests();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || !isSignedIn || loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <OwnerDashboardUI
        /*
         * Property management has moved to:
         * /dashboard/owner/properties
         *
         * Empty properties prevents the dashboard from becoming
         * another property-management screen.
         */
        recentPayments={recentPayments}
        paymentsLoading={paymentsLoading}
        paymentsError={paymentsError}
        inspectionRequests={inspectionRequests}
        inspectionRequestsLoading={inspectionRequestsLoading}
        inspectionRequestsError={inspectionRequestsError}
        dashboardStats={dashboardStats}
        user={user}
        onAddProperty={() => {
          window.location.href =
            "/dashboard/owner/properties/new";
        }}
        onTenantApplications={() => {
          window.location.href =
            "/dashboard/owner/tenant-applications";
        }}
        onMaintenance={() => {
          window.location.href =
            "/dashboard/owner/maintenance";
        }}
        onMarketplace={() => {
          window.location.href = "/marketplace";
        }}
        onAnalytics={() => {
          window.location.href =
            "/dashboard/owner/analytics";
        }}
      />

      {error && (
        <section className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <HandoverManagement getToken={getToken} />
      </section>
    </>
  );
}
