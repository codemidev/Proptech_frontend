"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  data: unknown;
  status: string;
  readAt: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  success: boolean;
  data?: {
    notifications: NotificationItem[];
    unreadCount: number;
  };
  message?: string;
};

function notificationHref(item: NotificationItem): string {
  if (!item.data || typeof item.data !== "object") {
    return "/dashboard/notifications";
  }

  const href = (item.data as Record<string, unknown>).href;
  if (
    typeof href === "string" &&
    href.startsWith("/") &&
    !href.startsWith("//") &&
    !href.includes("\\")
  ) {
    return href;
  }

  return "/dashboard/notifications";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function NotificationBell() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function refreshCount() {
      if (!isLoaded || !isSignedIn) return;

      try {
        const result = await apiFetch<{
          success: boolean;
          data?: { unreadCount: number };
        }>("/api/v1/me/notifications/unread-count", getToken);

        if (active && result.success) {
          setUnreadCount(Math.max(0, Number(result.data?.unreadCount) || 0));
        }
      } catch {
        // A notification badge must not interrupt dashboard navigation.
      }
    }

    void refreshCount();
    const interval = window.setInterval(() => void refreshCount(), 60_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [getToken, isLoaded, isSignedIn]);

  async function loadNotifications() {
    setLoading(true);
    setError("");

    try {
      const result = await apiFetch<NotificationsResponse>(
        "/api/v1/me/notifications?page=1&limit=20",
        getToken,
      );

      if (!result.success) {
        throw new Error(result.message || "Unable to load notifications.");
      }

      setItems(result.data?.notifications ?? []);
      setUnreadCount(Math.max(0, Number(result.data?.unreadCount) || 0));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function openPanel() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) await loadNotifications();
  }

  async function openNotification(item: NotificationItem) {
    if (!item.readAt) {
      try {
        await apiFetch(
          `/api/v1/me/notifications/${encodeURIComponent(item.id)}/read`,
          getToken,
          { method: "PATCH" },
        );

        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, readAt: new Date().toISOString(), status: "READ" }
              : entry,
          ),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch {
        // Navigation should still work if marking read fails.
      }
    }

    setOpen(false);
    router.push(notificationHref(item));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void openPanel()}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FACC15] px-1 text-[10px] font-bold leading-none text-[#111315]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-[100] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div>
              <h2 className="text-sm font-bold">Notifications</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                {unreadCount} unread
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard/notifications")}
              className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              View all
            </button>
          </div>

          <div className="max-h-[min(65vh,28rem)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-[var(--muted-foreground)]">
                <LoaderCircle size={17} className="animate-spin" />
                Loading notifications…
              </div>
            ) : error ? (
              <div className="px-4 py-8 text-center text-sm text-red-600">
                {error}
                <button
                  type="button"
                  onClick={() => void loadNotifications()}
                  className="mt-2 block w-full font-semibold"
                >
                  Try again
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto mb-2 text-[var(--muted-foreground)]" size={24} />
                <p className="text-sm font-semibold">You’re all caught up</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  New property and tenancy updates will appear here.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openNotification(item)}
                  className={`block w-full border-b border-[var(--border)] px-4 py-3 text-left transition hover:bg-[var(--surface-muted)] ${
                    !item.readAt ? "bg-[var(--surface-muted)]" : ""
                  }`}
                >
                  <span className="flex items-start gap-2">
                    {!item.readAt && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#D6A900]" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{item.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">
                        {item.body}
                      </span>
                      <span className="mt-2 block text-[10px] text-[var(--muted-foreground)]">
                        {formatDate(item.createdAt)}
                      </span>
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-[var(--border)] px-4 py-2">
            <button
              type="button"
              onClick={() => void loadNotifications()}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <CheckCheck size={14} />
              Refresh notifications
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
