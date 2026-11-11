"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Activity, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api";

export function NotificationActivityBar() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function refresh() {
      if (!isLoaded || !isSignedIn) return;
      try {
        const result = await apiFetch<{ success: boolean; data?: { unreadCount?: number } }>(
          "/api/v1/me/notifications/unread-count", getToken,
        );
        if (active && result.success) setCount(Math.max(0, Number(result.data?.unreadCount) || 0));
      } catch {}
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [getToken, isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn || count < 1) return null;
  return (
    <div className="border-b border-[#FACC15]/30 bg-[#FFF9DB] px-4 py-2 text-[#26364A] dark:border-[#FACC15]/20 dark:bg-[#242316] dark:text-[#FDE68A]">
      <Link href="/dashboard/notifications" className="mx-auto flex max-w-[1920px] items-center gap-2 text-xs">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D6A900] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#D6A900]" />
        </span>
        <Activity size={14} />
        <span className="font-semibold">{count} unread update{count === 1 ? "" : "s"}</span>
        <span className="hidden sm:inline">— review new activity and actions awaiting your attention</span>
        <span className="ml-auto inline-flex items-center gap-1 font-bold">Review <ArrowRight size={13} /></span>
      </Link>
    </div>
  );
}
