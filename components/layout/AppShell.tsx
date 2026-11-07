"use client";

import type { AppShellProps } from "../../types/ui";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function AppShell(props: AppShellProps) {
  const {
    children,
    sidebar,
    mobileNavigation,
    dashboardHeader,
    header,
    breadcrumbs,
    organization,
    userMenu,
    footer,
    mainContentId = "main-content",
    navigationLabel = "Primary navigation",
    mainContentLabel = "Main content",
    navigationOpen = false,
    state = "ready",
    loading = false,
    className,
  } = props;

  const isLoading =
    loading || state === "loading";

  const shellError =
    state === "error" && "error" in props
      ? props.error
      : null;

  return (
    <div
      className={cn(
        "min-h-screen bg-neutral-50 text-neutral-950",
        className,
      )}
    >
      <a
        href={`#${mainContentId}`}
        className="sr-only z-[100] rounded-md bg-black px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      {sidebar ? (
        <aside
          aria-label={navigationLabel}
          className={cn(
            "fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-transparent bg-white lg:block",
            navigationOpen &&
              "max-lg:block max-lg:w-[min(85vw,20rem)]",
          )}
        >
          {sidebar}
        </aside>
      ) : null}

      <div
        className={cn(
          "min-h-screen",
          sidebar ? "lg:pl-64" : false,
        )}
      >
        {dashboardHeader ? (
          dashboardHeader
        ) : header ? (
          <header className="sticky top-0 z-20 border-b border-transparent bg-white/95 backdrop-blur">
            <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
              <div className="min-w-0">
                {organization}
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {header}
                {userMenu}
              </div>
            </div>
          </header>
        ) : null}

        <main
          id={mainContentId}
          aria-label={mainContentLabel}
          aria-busy={isLoading || undefined}
          className="min-w-0"
        >
          {breadcrumbs ? (
            <div className="px-4 pt-4 sm:px-6">
              {breadcrumbs}
            </div>
          ) : null}

          {children}
        </main>

        {footer ? (
          <footer className="dashboard-shell-footer">{footer}</footer>
        ) : null}
      </div>

      {mobileNavigation ? (
        <div
          className="lg:hidden"
          aria-label="Mobile navigation"
        >
          {mobileNavigation}
        </div>
      ) : null}

      {shellError ? (
        <div
          role="alert"
          className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-lg sm:left-auto sm:max-w-md"
        >
          {shellError}
        </div>
      ) : null}

      {isLoading ? (
        <span
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          Loading
        </span>
      ) : null}
    </div>
  );
}

export default AppShell;
