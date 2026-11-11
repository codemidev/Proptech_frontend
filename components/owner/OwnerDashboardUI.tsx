"use client";

import { useState, type ReactNode } from "react";
import { useClerk } from "@clerk/nextjs";

import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ChevronRight,
  ClipboardCheck,
  FilePlus2,
  FileText,
  Home,
  KeyRound,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";

type OwnerDashboardPayment = {
  id: string;
  reference: string;
  purpose: string;
  method: string;
  status: string;
  currency: string;
  amount: string | number;
  total: string | number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  flutterwave: {
    transactionId: string | null;
  } | null;
};

type DashboardStats = {
  totalProperties: number;
  activeListings: number;
  rentableProperties: number;
  occupied: number;
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

type Props = {
  recentPayments?: OwnerDashboardPayment[];
  paymentsLoading?: boolean;
  paymentsError?: string;
  inspectionRequests?: OwnerInspection[];
  inspectionRequestsLoading?: boolean;
  inspectionRequestsError?: string;
  dashboardStats?: DashboardStats | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string;
  } | null;
  onTenantApplications?: () => void;
  onMaintenance?: () => void;
  onMarketplace?: () => void;
  onAnalytics?: () => void;
  onAddProperty?: () => void;
};

const quickActions = [
  {
    label: "Add Property",
    icon: FilePlus2,
    className: "bg-yellow-50",
  },
  {
    label: "My Properties",
    href: "/dashboard/owner/properties",
    icon: Building2,
    className: "bg-blue-50",
  },
  {
    label: "Tenant Apps",
    icon: UserRound,
    className: "bg-yellow-50",
  },
  {
    label: "Maintenance",
    icon: Wrench,
    className: "bg-violet-50",
  },
  {
    label: "Marketplace",
    icon: Home,
    className: "bg-orange-50",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    className: "bg-rose-50",
  },
  {
    label: "Payment Settings",
    href: "/dashboard/owner/payment-settings",
    icon: Settings,
    className: "bg-emerald-50",
  },
];

export function OwnerDashboardUI({
  recentPayments = [],
  paymentsLoading = false,
  paymentsError = "",
  inspectionRequests = [],
  inspectionRequestsLoading = false,
  inspectionRequestsError = "",
  dashboardStats,
  user,
  onTenantApplications,
  onMaintenance,
  onMarketplace,
  onAnalytics,
  onAddProperty,
}: Props) {
  const { signOut } = useClerk();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setProfileMenuOpen(false);

    await signOut({
      redirectUrl: "/sign-in",
    });
  };

  const firstName = user?.firstName || "Property Owner";

  const totalProperties =
    dashboardStats?.totalProperties ?? 0;

  const activeListings =
    dashboardStats?.activeListings ?? 0;

  const rentableProperties =
    dashboardStats?.rentableProperties ?? 0;

  const occupied =
    dashboardStats?.occupied ?? 0;

  const pendingInspectionCount =
    inspectionRequests.filter(
      (inspection) => inspection.status === "PENDING",
    ).length;

  /*
   * Occupancy is based only on RENT / LEASE properties.
   * SALE properties are not rental inventory.
   * SHORTLET occupancy will eventually come from bookings.
   */
  const occupancy =
    rentableProperties > 0
      ? Math.round((occupied / rentableProperties) * 100)
      : null;

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-slate-900">
      <div className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10">

        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Dashboard Overview
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome, {firstName}
            </h1>
          </div>

          <div className="flex items-center gap-3">{/* Profile */}
            <div className="relative">

              {/* Profile Avatar */}
              <button
                type="button"
                onClick={() =>
                  setProfileMenuOpen((open) => !open)
                }
                aria-label="Open profile menu"
                aria-expanded={profileMenuOpen}
                className="h-10 w-10 overflow-hidden rounded-full bg-slate-200 ring-2 ring-white transition hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserRound size={18} />
                  </div>
                )}
              </button>

              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <div
                  className="absolute right-0 top-12 z-50 w-56 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5"
                  role="menu"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-slate-50"
                    role="menuitem"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                      <Settings size={16} />
                    </span>

                    <span className="flex-1">
                      <span className="block">
                        Profile & Settings
                      </span>

                      <span className="block text-[11px] font-normal text-slate-400">
                        Manage your account
                      </span>
                    </span>
                  </button>

                  <div className="my-1 h-px bg-slate-100" />

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                    role="menuitem"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <LogOut size={16} />
                    </span>

                    <span className="flex-1">
                      <span className="block">
                        Sign Out
                      </span>

                      <span className="block text-[11px] font-normal text-red-400">
                        Sign out of your account
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Statistics */}
        <section className="mb-7 grid grid-cols-3 gap-3">
          <StatCard
            label="Total Properties"
            value={totalProperties}
            accent="bg-slate-900"
          />

          <StatCard
            label="Active Listings"
            value={activeListings}
            accent="bg-emerald-500"
          />

          <StatCard
            label="Occupied"
            value={occupied}
            accent="bg-yellow-400"
          />
        </section>

        {/* Quick Actions */}
        <section className="mb-7">
          <SectionHeader title="Quick Actions" />

          <div className="owner-quick-actions grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    if (action.href) {
                      window.location.href = action.href;
                      return;
                    }

                    switch (action.label) {
                      case "Add Property":
                        onAddProperty?.();
                        break;
                      case "Tenant Apps":
                        onTenantApplications?.();
                        break;
                      case "Maintenance":
                        onMaintenance?.();
                        break;
                      case "Marketplace":
                        onMarketplace?.();
                        break;
                      case "Analytics":
                        onAnalytics?.();
                        break;
                    }
                  }}
                  className={`${action.className} dashboard-quick-action-card !text-[#111111] flex min-h-[92px] flex-col justify-between rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
                    <Icon size={17} className="!text-[#111111]" />
                  </span>

                  <span className="!text-[#111111] text-xs font-semibold">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">

          {/* Recent Activity */}
          <section>
            <SectionHeader
              title="Recent Activity"
              action="See All"
            />

            <div className="space-y-3">
              <ActivityRow
                icon={<UserRound size={16} />}
                title="New tenant application"
                description="No recent tenant applications"
                time="Recently"
              />

              <ActivityRow
                icon={<Wrench size={16} />}
                title="Maintenance request"
                description="Maintenance activity will appear here"
                time="Recently"
              />

              <ActivityRow
                icon={<FileText size={16} />}
                title="Portfolio activity"
                description={
                  totalProperties
                    ? `${totalProperties} properties currently managed`
                    : "Add your first property"
                }
                time="Today"
              />
            </div>
          </section>

          {/* Dashboard Summary */}
          <section>
            <SectionHeader title="Dashboard Overview" />

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">
                    Overall Occupancy
                  </p>

                  <p className="mt-1 text-3xl font-bold">
                    {occupancy === null ? "N/A" : `${occupancy}%`}
                  </p>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                  {occupancy === null
                    ? "No rental properties"
                    : occupancy >= 70
                      ? "Healthy"
                      : "Needs attention"}
                </span>
              </div>

              <div className="flex h-32 items-end justify-between gap-3">
                {[48, 70, 58, 30, 76, 45].map(
                  (height, index) => (
                    <div
                      key={index}
                      className="flex h-full flex-1 items-end"
                    >
                      <div
                        className={`w-full rounded-t-lg ${
                          index === 3
                            ? "bg-slate-200"
                            : "bg-yellow-400"
                        }`}
                        style={{
                          height: `${height}%`,
                        }}
                      />
                    </div>
                  ),
                )}
              </div>

              <div className="mt-3 flex justify-between text-[10px] text-slate-400">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
              </div>
            </div>
          </section>
        </div>

        {/* Recent Payment Transactions */}
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Recent Transactions
              </h2>
              <p className="mt-1 text-[11px] text-slate-400">
                Your latest payment activity.
              </p>
            </div>

            <a
              href="/dashboard/owner/payments"
              className="shrink-0 text-[11px] font-semibold text-slate-700 transition hover:text-yellow-600"
            >
              View All Transactions
            </a>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            {paymentsLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-14 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : paymentsError ? (
              <div className="p-6 text-center">
                <p className="text-xs font-medium text-red-500">
                  {paymentsError}
                </p>
              </div>
            ) : recentPayments.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  No payment transactions yet
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Your payment activity will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentPayments.map((payment) => {
                  const purpose =
                    payment.purpose === "SERVICE_PAYMENT" &&
                    payment.description?.startsWith(
                      "Property sale listing submission fee:",
                    )
                      ? "Property Listing Submission"
                      : payment.purpose === "RENT"
                        ? "Rent Payment"
                        : payment.purpose
                            .replace(/_/g, " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (char) => char.toUpperCase());

                  const amount = Number(payment.total ?? payment.amount);
                  const formattedAmount = Number.isFinite(amount)
                    ? new Intl.NumberFormat("en-NG", {
                        style: "currency",
                        currency: payment.currency || "NGN",
                        maximumFractionDigits: 2,
                      }).format(amount)
                    : `${payment.currency || "NGN"} ${payment.total ?? payment.amount}`;

                  const status = payment.status.toUpperCase();

                  const statusClass =
                    status === "SUCCESS"
                      ? "bg-emerald-50 text-emerald-700"
                      : status === "FAILED" || status === "CANCELLED"
                        ? "bg-red-50 text-red-700"
                        : status === "REFUNDED"
                          ? "bg-violet-50 text-violet-700"
                          : "bg-yellow-50 text-yellow-700";

                  return (
                    <div
                      key={payment.id}
                      className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          {purpose}
                        </p>

                        <p className="mt-1 truncate text-[10px] text-slate-400">
                          Ref: {payment.reference}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                          {new Date(payment.createdAt).toLocaleDateString(
                            "en-NG",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass}`}
                        >
                          {status}
                        </span>

                        <span className="min-w-[100px] text-right text-xs font-bold text-slate-900">
                          {formattedAmount}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Pending Requests */}
        <section className="mt-7">
          <SectionHeader title="Pending Requests" />

          <div className="space-y-3">
            <DashboardRow
              icon={<ClipboardCheck size={18} />}
              title="Inspection Requests"
              value={
                inspectionRequestsLoading
                  ? "Loading..."
                  : `${pendingInspectionCount} pending`
              }
            />

            <DashboardRow
              icon={<Bell size={18} />}
              title="Notifications"
              value="View updates"
            />

            <DashboardRow
              icon={<Settings size={18} />}
              title="Profile & Settings"
              value="Manage account"
            />
          </div>

          {inspectionRequestsError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
              {inspectionRequestsError}
            </div>
          )}

          {!inspectionRequestsLoading &&
            !inspectionRequestsError &&
            inspectionRequests.length > 0 && (
              <div className="mt-3 space-y-2">
                {inspectionRequests.slice(0, 5).map((inspection) => {
                  const customerName =
                    [
                      inspection.booking?.customer?.firstName,
                      inspection.booking?.customer?.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ") ||
                    inspection.booking?.customer?.email ||
                    "Inspection requester";

                  const scheduledDate =
                    new Date(
                      inspection.scheduledAt,
                    ).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });

                  return (
                    <div
                      key={inspection.id}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {inspection.property.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {customerName}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {scheduledDate}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-yellow-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-yellow-800">
                          {inspection.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          {!inspectionRequestsLoading &&
            !inspectionRequestsError &&
            inspectionRequests.length === 0 && (
              <p className="mt-3 px-1 text-xs text-slate-500">
                No pending or confirmed inspection requests.
              </p>
            )}
        </section>

        {/* Mobile Navigation */}
        <nav className="dashboard-bottom-navigation owner-bottom-tab-bar fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <BottomNavItem
              icon={<Home size={19} />}
              label="Home"
              active
              count={totalProperties}
            />

            <BottomNavItem
              icon={<Search size={19} />}
              label="Search"
            />

            <BottomNavItem
              icon={<ShieldCheck size={19} />}
              label="Saved"
            />

            <BottomNavItem
              icon={<Activity size={19} />}
              label="Activity"
              count={pendingInspectionCount}
            />

            <BottomNavItem
              icon={<UserRound size={19} />}
              label="Profile"
            />
          </div>
        </nav>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <p className="text-[10px] font-medium leading-tight text-slate-500 sm:text-xs">
        {label}
      </p>

      <div className="mt-3 flex items-end justify-between">
        <span className="text-2xl font-bold">
          {value}
        </span>

        <span
          className={`h-1 w-8 rounded-full ${accent}`}
        />
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className={title === "Quick Actions" ? "dashboard-quick-actions-heading text-sm font-bold" : "text-sm font-bold"}>
        {title}
      </h2>

      {action && (
        <button
          type="button"
          className="text-xs font-medium text-slate-400"
        >
          {action}
        </button>
      )}
    </div>
  );
}

function ActivityRow({
  icon,
  title,
  description,
  time,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  time: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">
          {title}
        </p>

        <p className="truncate text-[11px] text-slate-400">
          {description}
        </p>
      </div>

      <span className="shrink-0 text-[10px] text-slate-400">
        {time}
      </span>
    </div>
  );
}

function DashboardRow({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
        {icon}
      </span>

      <span className="flex-1">
        <span className="block text-xs font-semibold">
          {title}
        </span>

        <span className="text-[11px] text-slate-400">
          {value}
        </span>
      </span>

      <ChevronRight
        size={17}
        className="text-slate-400"
      />
    </button>
  );
}

function BottomNavItem({
  icon,
  label,
  active = false,
  count = 0,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  count?: number;
}) {
  return (
    <button
      type="button"
      className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
        active
          ? "text-slate-900"
          : "text-slate-400"
      }`}
    >
      <span className="relative inline-flex">
        {icon}
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FACC15] px-1 text-[9px] font-extrabold leading-none text-[#111315] shadow-sm">
            {count > 99 ? "99+" : count}
          </span>
        )}
        {active && <span aria-hidden="true" className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#FACC15] ring-2 ring-white animate-pulse" />}
      </span>

      <span>{label}</span>
    </button>
  );
}