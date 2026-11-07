"use client";

import type { ReactNode } from "react";
import { Bell, ChevronRight, Menu } from "lucide-react";

import { Skeleton } from "@/components/ui/Skeleton";

export interface DashboardBreadcrumb {
  label: string;
  href?: string;
}

export interface DashboardHeaderProps {
  /**
   * Primary page title.
   */
  title?: string;

  /**
   * Optional supporting text displayed with the page title.
   */
  description?: string;

  /**
   * Breadcrumb trail. The final item is treated as the current page.
   */
  breadcrumbs?: DashboardBreadcrumb[];

  /**
   * Optional organization/context slot.
   */
  organization?: ReactNode;

  /**
   * Notification trigger/panel slot.
   *
   * The parent owns all notification behavior and data fetching.
   */
  notifications?: ReactNode;

  /**
   * User menu slot.
   *
   * The parent owns authentication and user-menu behavior.
   */
  userMenu?: ReactNode;

  /**
   * Optional sidebar/mobile-navigation trigger.
   */
  navigationOpen?: boolean;

  /**
   * Called only when the navigation trigger is pressed.
   *
   * No authorization or navigation logic belongs here.
   */
  onNavigationOpenChange?: (open: boolean) => void;

  /**
   * Render the header in its loading/skeleton state.
   */
  loading?: boolean;

  /**
   * Optional accessible label for the navigation toggle.
   */
  navigationLabel?: string;

  /**
   * Additional classes for the outer header.
   */
  className?: string;
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Breadcrumbs({
  breadcrumbs,
  loading,
}: {
  breadcrumbs?: DashboardBreadcrumb[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div
        aria-hidden="true"
        className="flex min-w-0 items-center gap-2"
      >
        <Skeleton variant="text" className="h-3 w-16" />
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
        <Skeleton variant="text" className="h-3 w-24" />
      </div>
    );
  }

  if (!breadcrumbs?.length) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="min-w-0"
    >
      <ol className="flex min-w-0 items-center gap-1.5 overflow-hidden text-xs text-neutral-500">
        {breadcrumbs.map((item, index) => {
          const isCurrent = index === breadcrumbs.length - 1;

          return (
            <li
              key={`${item.label}-${index}`}
              className="flex min-w-0 items-center gap-1.5"
            >
              {index > 0 ? (
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-neutral-300"
                />
              ) : null}

              {isCurrent || !item.href ? (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "truncate",
                    isCurrent
                      ? "font-medium text-neutral-700"
                      : "text-neutral-500",
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  className="truncate transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2"
                >
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function HeaderLoadingSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex min-w-0 flex-1 flex-col gap-1.5"
    >
      <div className="flex items-center gap-2">
        <Skeleton variant="text" className="h-3 w-20" />
        <ChevronRight className="h-3.5 w-3.5 text-neutral-200" />
        <Skeleton variant="text" className="h-3 w-28" />
      </div>

      <Skeleton
        variant="title"
        className="h-6 w-36 sm:h-7 sm:w-48"
      />
    </div>
  );
}

function DefaultNotificationButton() {
  return (
    <button
      type="button"
      aria-label="Notifications"
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 items-center justify-center",
        "rounded-lg border border-neutral-200 bg-white text-neutral-700",
        "transition-colors hover:bg-neutral-50 hover:text-neutral-950",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-yellow-400 focus-visible:ring-offset-2",
      )}
    >
      <Bell
        aria-hidden="true"
        className="h-5 w-5"
      />
    </button>
  );
}

export function DashboardHeader({
  title,
  description,
  breadcrumbs,
  organization,
  notifications,
  userMenu,
  navigationOpen = false,
  onNavigationOpenChange,
  loading = false,
  navigationLabel = "Open navigation",
  className,
}: DashboardHeaderProps) {
  const hasNavigationTrigger = Boolean(onNavigationOpenChange);

  const handleNavigationToggle = () => {
    if (!onNavigationOpenChange) {
      return;
    }

    onNavigationOpenChange(!navigationOpen);
  };

  return (
    <header
      aria-busy={loading || undefined}
      className={cn(
        "sticky top-0 z-30 w-full !border-0 !shadow-none",
        "bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85",
        className,
      )}
    >
      <div className="mx-auto flex min-h-14 w-full max-w-[1920px] items-center px-3 sm:min-h-16 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {hasNavigationTrigger ? (
            <button
              type="button"
              aria-label={
                navigationOpen
                  ? "Close navigation"
                  : navigationLabel
              }
              aria-expanded={navigationOpen}
              aria-controls="dashboard-navigation"
              onClick={handleNavigationToggle}
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center",
                "rounded-lg border border-neutral-200 bg-white text-neutral-800",
                "transition-colors hover:bg-neutral-50",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-yellow-400 focus-visible:ring-offset-2",
                "lg:hidden",
              )}
            >
              <Menu
                aria-hidden="true"
                className="h-5 w-5"
              />
            </button>
          ) : null}

          <div className="min-w-0 flex-1">
            {loading ? (
              <HeaderLoadingSkeleton />
            ) : (
              <div className="min-w-0">
                <div className="hidden min-w-0 sm:block">
                  <Breadcrumbs
                    breadcrumbs={breadcrumbs}
                    loading={false}
                  />
                </div>

                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0">
                    {title ? (
                      <h1 className="truncate text-base font-semibold tracking-tight text-neutral-950 sm:text-lg lg:text-xl">
                        {title}
                      </h1>
                    ) : null}

                    {description ? (
                      <p className="mt-0.5 hidden max-w-2xl truncate text-sm text-neutral-500 md:block">
                        {description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-0.5 sm:hidden">
                  <Breadcrumbs
                    breadcrumbs={breadcrumbs}
                    loading={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-1.5 sm:gap-2">
          {loading ? (
            <>
              <Skeleton
                variant="rect"
                className="hidden h-9 w-24 rounded-lg md:block"
              />
              <Skeleton
                variant="avatar"
                className="h-9 w-9 rounded-full sm:h-10 sm:w-10"
              />
            </>
          ) : (
            <>
              {organization ? (
                <div className="hidden min-w-0 max-w-48 lg:block">
                  {organization}
                </div>
              ) : null}

              <div className="shrink-0">
                {notifications ?? <DefaultNotificationButton />}
              </div>

              {userMenu ? (
                <div className="shrink-0">
                  {userMenu}
                </div>
              ) : (
                <button
                  type="button"
                  aria-label="Open user menu"
                  className={cn(
                    "inline-flex h-10 w-10 shrink-0 items-center justify-center",
                    "rounded-full border border-neutral-200 bg-neutral-100",
                    "text-sm font-semibold text-neutral-700",
                    "transition-colors hover:bg-neutral-200",
                    "focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-yellow-400 focus-visible:ring-offset-2",
                  )}
                >
                  <span aria-hidden="true">U</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
