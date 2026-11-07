"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import PaginationControls from "@/components/PaginationControls";

type MaintenanceRequestSummary = {
  id: string;
  title: string;
  category: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  property: { id: string; title: string };
  assignedTo: { firstName: string | null; lastName: string | null } | null;
};

type ListResponse = {
  success: boolean;
  data: MaintenanceRequestSummary[];
};

const statusLabel: Record<MaintenanceRequestSummary["status"], string> = {
  OPEN: "Submitted",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusTone: Record<MaintenanceRequestSummary["status"], "success" | "pending" | "danger"> = {
  OPEN: "pending",
  ASSIGNED: "pending",
  IN_PROGRESS: "pending",
  ON_HOLD: "pending",
  COMPLETED: "success",
  CANCELLED: "danger",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MaintenancePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<MaintenanceRequestSummary[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const load = async () => {
      try {
        const res = await apiFetch<ListResponse>(
          "/api/v1/maintenance-requests/me",
          getToken,
        );
        setRequests(res.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load your requests",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLoaded, isSignedIn, getToken, router]);

  const orderedRequests = [...requests].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const visibleRequests = orderedRequests.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <TopAppBar title="Maintenance" />

      <div className="mx-auto max-w-lg px-4 py-4">
        <Link
          href="/dashboard/tenant/maintenance/new"
          className="flex items-center justify-center gap-2 rounded-full bg-brand-yellow px-4 py-3 text-sm font-semibold text-black"
        >
          <Plus size={18} />
          Submit New Request
        </Link>

        <div className="mt-5 space-y-3">
          {loading ? (
            <p className="text-sm text-black/40">Loading your requests...</p>
          ) : error ? (
            <p className="text-sm text-status-danger-fg">{error}</p>
          ) : requests.length === 0 ? (
            <Card className="flex flex-col items-center gap-1 p-8 text-center">
              <p className="font-semibold">No maintenance requests yet</p>
              <p className="text-sm text-black/50">
                Submit a request if something in your rental needs attention.
              </p>
            </Card>
          ) : (
            visibleRequests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{request.title}</p>
                    <p className="text-xs text-black/50">
                      {request.property.title}
                      {request.category ? ` · ${request.category}` : ""}
                    </p>
                  </div>
                  <StatusPill tone={statusTone[request.status]}>
                    {statusLabel[request.status]}
                  </StatusPill>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-black/40">
                  <span>{formatDate(request.createdAt)}</span>
                  {request.assignedTo && (
                    <span>
                      Assigned to {request.assignedTo.firstName}{" "}
                      {request.assignedTo.lastName}
                    </span>
                  )}
                </div>
              </Card>
            ))
          )}
          {!loading && !error && requests.length > 0 && (
            <PaginationControls page={page} totalItems={requests.length} pageSize={pageSize} onPageChange={setPage} />
          )}
        </div>
      </div>
    </>
  );
}
