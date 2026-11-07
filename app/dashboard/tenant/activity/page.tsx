"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { TopAppBar } from "@/components/shell/TopAppBar";
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

type ApiResponse = {
  success: boolean;
  data?: {
    notifications: NotificationItem[];
    unreadCount: number;
    pagination?: { page: number; totalPages: number; total: number };
  };
  message?: string;
};

function getHref(item: NotificationItem) {
  if (!item.data || typeof item.data !== "object") return "/dashboard/notifications";
  const href = (item.data as Record<string, unknown>).href;
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//")
    ? href
    : "/dashboard/tenant/activity";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function ActivityPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError("");

    try {
      const result = await apiFetch<ApiResponse>(
        "/api/v1/me/notifications?page=1&limit=50",
        getToken,
      );
      if (!result.success) throw new Error(result.message || "Unable to load activity.");
      setItems(result.data?.notifications ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load activity.");
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openItem(item: NotificationItem) {
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
      } catch {
        // Keep the destination accessible if the read update fails.
      }
    }
    router.push(getHref(item));
  }

  return (
    <>
      <TopAppBar title="Activity" />
      <main className="mx-auto min-h-[70vh] max-w-3xl space-y-5 px-4 py-6 text-[var(--foreground)] sm:px-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Updates
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Application, payment, inspection and tenancy updates.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-12 text-sm text-[var(--muted-foreground)]">
            <LoaderCircle size={18} className="animate-spin" />
            Loading activity…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button onClick={() => void load()} className="ml-2 font-semibold underline">
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-12 text-center">
            <Bell className="mx-auto mb-3 text-[var(--muted-foreground)]" size={28} />
            <h2 className="font-semibold">No notifications yet</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Updates about your applications and tenancy will appear here.
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void openItem(item)}
                className="flex w-full gap-3 border-b border-[var(--border)] px-4 py-4 text-left last:border-b-0 hover:bg-[var(--surface-muted)]"
              >
                <span className="mt-1 shrink-0">
                  {item.readAt ? (
                    <CheckCheck size={18} className="text-[var(--muted-foreground)]" />
                  ) : (
                    <span className="block h-2.5 w-2.5 rounded-full bg-[#D6A900]" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-[var(--muted-foreground)]">
                    {item.body}
                  </span>
                  <span className="mt-2 block text-xs text-[var(--muted-foreground)]">
                    {formatDate(item.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
