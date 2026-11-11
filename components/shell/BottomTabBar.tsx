"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import { Home, Search, Bookmark, Bell, User } from "lucide-react";

const tabs = [
  { href: "/dashboard/tenant", label: "Home", icon: Home },
  { href: "/dashboard/tenant/search", label: "Search", icon: Search },
  { href: "/dashboard/tenant/properties", label: "My Properties", icon: Bookmark },
  { href: "/dashboard/tenant/activity", label: "Activity", icon: Bell },
  { href: "/dashboard/tenant/profile", label: "Profile", icon: User },
];

const ACTIVITY_PREFIXES = [
  "/dashboard/tenant/activity",
  "/dashboard/tenant/payments",
  "/dashboard/tenant/inspections",
  "/dashboard/tenant/maintenance",
  "/dashboard/tenant/utilities",
  "/dashboard/tenant/applications",
  "/dashboard/tenant/move-in",
];

const SEARCH_PREFIXES = [
  "/dashboard/tenant/search",
  "/dashboard/tenant/properties",
];

function isTabActive(href: string, pathname: string) {
  if (href === "/dashboard/tenant") return pathname === href;
  if (href.endsWith("/activity")) {
    return ACTIVITY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  }
  if (href.endsWith("/search")) {
    return SEARCH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  }
  return pathname.startsWith(href);
}

export function BottomTabBar() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadUnreadCount() {
      if (!isLoaded || !isSignedIn) return;

      try {
        const response = await apiFetch<{
          success: boolean;
          data?: { unreadCount: number };
        }>("/api/v1/me/notifications/unread-count", getToken);

        if (active && response.success) {
          setUnreadCount(
            Number.isSafeInteger(response.data?.unreadCount)
              ? Math.max(0, response.data!.unreadCount)
              : 0,
          );
        }
      } catch {
        // A badge failure must never block tenant navigation.
      }
    }

    void loadUnreadCount();
    const interval = window.setInterval(() => {
      void loadUnreadCount();
    }, 60_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [getToken, isLoaded, isSignedIn]);

  return (
    <nav
      aria-label="Tenant navigation"
      className="dashboard-bottom-navigation tenant-bottom-tab-bar fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {tabs.map((tab) => {
          const isActive = isTabActive(tab.href, pathname);

          const Icon = tab.icon;

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] ${
                  isActive ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                }`}
              >
                <span className="relative inline-flex">
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.25 : 1.75}
                    aria-hidden="true"
                    className={isActive ? "drop-shadow-[0_0_5px_rgba(250,204,21,0.55)]" : ""}
                  />
                  {isActive && (
                    <span aria-hidden="true" className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#FACC15] ring-2 ring-white animate-pulse" />
                  )}
                  {tab.href.endsWith("/activity") && unreadCount > 0 && (
                    <span
                      aria-label={`${unreadCount} unread notifications`}
                      className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-[#FACC15] px-1 text-[9px] font-extrabold leading-none text-[#111315] shadow-sm"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
