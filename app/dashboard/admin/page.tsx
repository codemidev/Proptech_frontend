"use client";

import { UserButton, useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { LoadingScreen } from "@/components/shell/LoadingScreen";
import { DashboardHeader } from "@/components/shell/DashboardHeader";
import { StatusPill } from "@/components/ui/StatusPill";

type User = {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
};

type UsersResponse = {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

type DashboardStats = {
  totalUsers: number;
  totalProperties: number;
  totalAgents: number;
  totalOwners: number;
  pendingProperties: number;
  publishedProperties: number;
};

type StatsResponse = {
  success: boolean;
  data: DashboardStats;
};

type Property = {
  id: string;
  propertyCode: string;
  title: string;
  listingType: string;
  status: string;
  price: string | number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  createdAt: string;
  owner: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phoneNumber: string | null;
  } | null;
  propertyType?: {
    id: string;
    name: string;
    category: string;
  } | null;
  media?: {
    id: string;
    fileUrl: string;
    isFeatured?: boolean;
  }[];
};

type PendingPropertiesResponse = {
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

type ActionResponse = {
  success: boolean;
  message: string;
};

type StatCardProps = {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  highlight?: boolean;
};

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProperties: 0,
    totalAgents: 0,
    totalOwners: 0,
    pendingProperties: 0,
    publishedProperties: 0,
  });

  const [users, setUsers] = useState<User[]>([]);
  const [pendingProperties, setPendingProperties] = useState<Property[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [rejectingProperty, setRejectingProperty] =
    useState<Property | null>(null);

  const [rejectReason, setRejectReason] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [statsResponse, usersResponse, pendingResponse] =
        await Promise.all([
          apiFetch<StatsResponse>(
            "/api/v1/admin/dashboard/stats",
            getToken,
          ),

          apiFetch<UsersResponse>(
            "/api/v1/users?page=1&limit=8",
            getToken,
          ),

          apiFetch<PendingPropertiesResponse>(
            "/api/v1/admin/properties/pending?page=1&limit=8",
            getToken,
          ),
        ]);

      setStats(statsResponse.data);
      setUsers(usersResponse.data.users);
      setPendingProperties(pendingResponse.data.properties);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load admin dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function approveProperty(propertyId: string) {
    setActionLoading(propertyId);
    setError("");

    try {
      await apiFetch<ActionResponse>(
        `/api/v1/admin/properties/${propertyId}/approve`,
        getToken,
        {
          method: "POST",
        },
      );

      await loadDashboard();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to approve property.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectProperty() {
    if (!rejectingProperty || !rejectReason.trim()) {
      return;
    }

    const propertyId = rejectingProperty.id;

    setActionLoading(propertyId);
    setError("");

    try {
      await apiFetch<ActionResponse>(
        `/api/v1/admin/properties/${propertyId}/reject`,
        getToken,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: rejectReason.trim(),
          }),
        },
      );

      setRejectingProperty(null);
      setRejectReason("");

      await loadDashboard();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to reject property.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading your admin dashboard..." />;
  }

  const displayName =
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Administrator";

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-gray-950">

      {/* AGENT_GOVERNANCE_HOME_PANEL_V2 */}
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-transparent bg-[#111827] text-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 font-black text-black">
              A
            </div>

            <div>
              <div className="text-sm font-semibold tracking-tight">
                Aviritech{" "}
                <span className="text-yellow-400">PropTech</span>
              </div>

              <div className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 sm:block">
                Administration Console
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{displayName}</p>

              <p className="text-xs text-gray-500">Administrator</p>
            </div>

            <UserButton />
          </div>
        </div>
      </header>


      <div className="flex">
        {/* SIDEBAR */}
        <aside className="hidden w-64 shrink-0 border-r border-transparent bg-white md:block">
          <div className="sticky top-16 min-h-[calc(100vh-4rem)] p-4">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
              Platform
            </p>

            <nav className="dashboard-sidebar-navigation space-y-1">
              <SidebarItem
                active
                icon={<GridIcon />}
                label="Overview"
              />

              <SidebarItem
                icon={<ActivityIcon />}
                label="Analytics"
                onClick={() => {
                  window.location.href = "/dashboard/admin/analytics";
                }}
              />

              <SidebarItem
                icon={<UsersIcon />}
                label="Users"
                badge={stats.totalUsers}
              />

              <SidebarItem
                icon={<BuildingIcon />}
                label="Properties"
                onClick={() => { window.location.href = "/dashboard/admin/properties/verify"; }}
              />
              <SidebarItem
                icon={<ShieldIcon />}
                label="Verify Properties"
                onClick={() => { window.location.href = "/dashboard/admin/properties/verify"; }}
              />
              <SidebarItem
                icon={<AgentIcon />}
                label="Assign Agents"
                onClick={() => { window.location.href = "/dashboard/admin/properties/assign"; }}
              />

              <SidebarItem
                icon={<AgentIcon />}
                label="Agents"
                onClick={() => {
                  window.location.href = "/dashboard/admin/agents";
                }}
              />
              <SidebarItem
                icon={<ShieldIcon />}
                label="LandVaultX Review"
                onClick={() => {
                  window.location.href = "/dashboard/admin/land-vault";
                }}
              />
              <SidebarItem
                icon={<ActivityIcon />}
                label="Aero Operations"
                onClick={() => {
                  window.location.href = "/dashboard/admin/aero";
                }}
              />

              <SidebarItem
                icon={<OrganizationIcon />}
                label="Organizations"
              />

              <SidebarItem
                icon={<ShieldIcon />}
                label="Roles & Permissions"
              />

              <SidebarItem
                icon={<ActivityIcon />}
                label="Audit Logs"
              />
            </nav>

            <div className="my-6 border-t border-gray-100" />

            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
              System
            </p>

            <SidebarItem
              icon={<SettingsIcon />}
              label="Settings"
              onClick={() => {
                window.location.href = "/dashboard/admin/settings";
              }}
            />
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-6">
          <div className="mx-auto max-w-[1500px]">
            {/* MOBILE NAV */}
            <div className="mb-6 flex gap-2 overflow-x-auto md:hidden">
              {[
                "Overview",
                "Users",
                "Properties",
                "Audit Logs",
              ].map((item, index) => (
                <button
                  key={item}
                  className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold ${
                    index === 0
                      ? "bg-[#111827] text-white"
                      : "bg-white text-gray-600"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* PAGE HEADER */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-600">
                  Administration
                </p>

                <h1 className="text-3xl font-black tracking-tight">
                  Good to see you, {displayName}.
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                  Monitor the Aviritech PropTech platform, manage
                  users, and authorize property listings.
                </p>
              </div>

              <button
                onClick={loadDashboard}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FACC15] px-5 text-sm font-bold text-slate-950 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshIcon
                  className={loading ? "animate-spin" : ""}
                />

                Refresh
              </button>
            </div>

            {/* ERROR */}
            {error && (
              <div className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div>
                  <p className="font-bold">Dashboard error</p>

                  <p className="mt-1">{error}</p>
                </div>

                <button
                  onClick={() => setError("")}
                  className="font-bold"
                >
                  ×
                </button>
              </div>
            )}

            {/* STAT CARDS */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <StatCard
                title="Total Users"
                value={loading ? "—" : stats.totalUsers}
                subtitle="Registered accounts"
                icon={<UsersIcon />}
              />

              <StatCard
                title="Properties"
                value={loading ? "—" : stats.totalProperties}
                subtitle="Platform inventory"
                icon={<BuildingIcon />}
              />

              <StatCard
                title="Agents"
                value={loading ? "—" : stats.totalAgents}
                subtitle="Active agents"
                icon={<AgentIcon />}
              />

              <StatCard
                title="Owners"
                value={loading ? "—" : stats.totalOwners}
                subtitle="Active owners"
                icon={<OwnerIcon />}
              />

              <StatCard
                title="Awaiting Review"
                value={loading ? "—" : stats.pendingProperties}
                subtitle="Require authorization"
                icon={<ClockIcon />}
                highlight={stats.pendingProperties > 0}
              />

              <StatCard
                title="Published"
                value={loading ? "—" : stats.publishedProperties}
                subtitle="Live marketplace"
                icon={<CheckIcon />}
              />
            </div>

            {/* PROPERTY REVIEW QUEUE */}
            <section className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold">
                      Property Review Queue
                    </h2>

                    {stats.pendingProperties > 0 && (
                      <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-[11px] font-bold text-yellow-800">
                        {stats.pendingProperties} pending
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    Properties submitted by owners and awaiting
                    admin authorization.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                  <span className="h-2 w-2 rounded-full bg-yellow-400" />
                  Admin authorization required
                </div>
              </div>

              {loading ? (
                <ReviewSkeleton />
              ) : pendingProperties.length === 0 ? (
                <EmptyReviewState />
              ) : (
                <div className="divide-y divide-gray-100">
                  {pendingProperties.map((property) => (
                    <PropertyReviewRow
                      key={property.id}
                      property={property}
                      loading={actionLoading === property.id}
                      onApprove={() => approveProperty(property.id)}
                      onReject={() => setRejectingProperty(property)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* RECENT USERS */}
            <section className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5 sm:px-6">
                <div>
                  <h2 className="text-sm font-semibold">Recent Users</h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Latest registered platform accounts.
                  </p>
                </div>

                <span className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600">
                  {stats.totalUsers} total
                </span>
              </div>

              {loading ? (
                <div className="space-y-4 p-6">
                  <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                  <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                  <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                </div>
              ) : users.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-gray-500">
                  No users found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70">
                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          User
                        </th>

                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          Email
                        </th>

                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {users.map((item) => {
                        const name =
                          `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() ||
                          "Unnamed user";

                        return (
                          <tr
                            key={item.id}
                            className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-semibold text-yellow-400">
                                  {getInitials(
                                    item.firstName,
                                    item.lastName,
                                  )}
                                </div>

                                <div>
                                  <p className="font-bold">{name}</p>

                                  <p className="text-xs text-gray-400">
                                    User ID: {item.id.slice(0, 10)}…
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-gray-500">
                              {item.email}
                            </td>

                            <td className="px-6 py-4">
                              <StatusBadge active={item.isActive} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>

      {/* REJECTION MODAL */}
      {rejectingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                  Reject property
                </p>

                <h3 className="mt-1 text-xl font-black">
                  Return for correction
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {rejectingProperty.title}
                </p>
              </div>

              <button
                onClick={() => {
                  setRejectingProperty(null);
                  setRejectReason("");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-xl text-gray-500 hover:bg-gray-200"
              >
                ×
              </button>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-800">
                Reason for rejection
              </span>

              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Explain what the property owner needs to correct..."
                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm outline-none transition focus:border-black focus:bg-white focus:ring-2 focus:ring-black/5"
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  setRejectingProperty(null);
                  setRejectReason("");
                }}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={rejectProperty}
                disabled={
                  !rejectReason.trim() ||
                  actionLoading === rejectingProperty.id
                }
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === rejectingProperty.id
                  ? "Rejecting..."
                  : "Reject Property"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function StatCard({
  title,
  value,
  subtitle,
  icon,
  highlight = false,
}: StatCardProps) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        highlight
          ? "border-yellow-200 bg-yellow-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            highlight
              ? "bg-yellow-400 text-black"
              : "bg-black text-yellow-400"
          }`}
        >
          {icon}
        </div>

        {highlight && (
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-yellow-500" />
        )}
      </div>

      <p className="mt-5 text-sm font-medium text-gray-500">{title}</p>

      <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>

      <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
    </div>
  );
}

function SidebarItem({
  label,
  icon,
  active = false,
  badge,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
        active
          ? "bg-[#111827] text-white shadow-sm"
          : "text-gray-600 hover:bg-gray-100 hover:text-black"
      }`}
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>

      {badge !== undefined && badge > 0 && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] ${
            active
              ? "bg-yellow-400 text-black"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function PropertyReviewRow({
  property,
  loading,
  onApprove,
  onReject,
}: {
  property: Property;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const ownerName =
    `${property.owner?.firstName ?? ""} ${property.owner?.lastName ?? ""}`.trim() ||
    property.owner?.email ||
    "Unknown owner";

  const price = formatPrice(property.price, property.currency);

  const created = new Date(property.createdAt).toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );

  return (
    <div className="p-5 transition hover:bg-gray-50/60 sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="hidden h-16 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-100 sm:block">
            {property.media?.[0]?.fileUrl ? (
              <img
                src={property.media[0].fileUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <BuildingIcon />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-black">
                {property.title}
              </h3>

              <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-yellow-800">
                Pending approval
              </span>
            </div>

            <p className="mt-1 text-xs font-medium text-gray-400">
              {property.propertyCode}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
              <span>{property.listingType}</span>

              <span>
                {property.propertyType?.name ?? "Property"}
              </span>

              {property.bedrooms !== null && (
                <span>{property.bedrooms} bed</span>
              )}

              {property.bathrooms !== null && (
                <span>{property.bathrooms} bath</span>
              )}

              <span>{price}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
              <span>
                Owner:{" "}
                <span className="font-semibold text-gray-600">
                  {ownerName}
                </span>
              </span>

              <span>Submitted {created}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            disabled={loading}
            onClick={onReject}
            className="rounded-xl border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Reject
          </button>

          <button
            disabled={loading}
            onClick={onApprove}
            className="rounded-xl bg-black px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyReviewState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-green-50 text-green-600">
        <CheckIcon />
      </div>

      <h3 className="mt-5 text-sm font-semibold">
        Review queue is clear
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
        There are currently no properties waiting for administrative
        authorization.
      </p>
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex gap-4 p-6">
          <div className="hidden h-16 w-20 animate-pulse rounded-2xl bg-gray-100 sm:block" />

          <div className="flex-1 space-y-3">
            <div className="h-5 w-2/3 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
        active
          ? "bg-green-50 text-green-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-green-500" : "bg-red-500"
        }`}
      />

      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function getInitials(
  firstName: string | null,
  lastName: string | null,
) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";

  return `${first}${last}`.toUpperCase() || "U";
}

function formatPrice(
  value: string | number,
  currency: string,
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${currency} —`;
  }

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency === "NGN" ? "NGN" : currency,
      maximumFractionDigits: 0,
    }).format(number);
  } catch {
    return `${currency} ${number.toLocaleString()}`;
  }
}

/* -------------------------------------------------------------------------- */
/* ICONS                                                                      */
/* -------------------------------------------------------------------------- */

function GridIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function UsersIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BuildingIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 21h18" />
      <path d="M6 21V5l6-3 6 3v16" />
      <path d="M9 9h1" />
      <path d="M14 9h1" />
      <path d="M9 13h1" />
      <path d="M14 13h1" />
      <path d="M9 17h1" />
      <path d="M14 17h1" />
    </svg>
  );
}

function AgentIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="7" r="4" />
      <path d="M5 21a7 7 0 0 1 14 0" />
      <path d="M19 8l2 2-2 2" />
      <path d="M21 10h-5" />
    </svg>
  );
}

function OwnerIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 21h18" />
      <path d="M5 21V9l7-5 7 5v12" />
      <path d="M9 21v-5h6v5" />
    </svg>
  );
}

function OrganizationIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 8h2" />
      <path d="M14 8h2" />
      <path d="M8 12h2" />
      <path d="M14 12h2" />
      <path d="M8 16h2" />
      <path d="M14 16h2" />
    </svg>
  );
}

function ShieldIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ActivityIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  );
}

function SettingsIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.5 1.5-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-2.12v-.4a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.5-1.5.06-.06A1.7 1.7 0 0 0 7.2 15a1.7 1.7 0 0 0-1.56-1.03H5v-2.12h.64A1.7 1.7 0 0 0 7.2 10.8a1.7 1.7 0 0 0-.34-1.88L6.8 8.86l1.5-1.5.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56V5h2.12v.4a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.5 1.5-.06.06A1.7 1.7 0 0 0 19.4 10c.18.62.74 1.03 1.39 1.03H21v2.12h-.21c-.65 0-1.21.41-1.39 1.03Z" />
    </svg>
  );
}

function ClockIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CheckIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function RefreshIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
    </svg>
  );
}