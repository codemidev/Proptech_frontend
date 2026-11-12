"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationActivityBar } from "@/components/notifications/NotificationActivityBar";

export function DashboardQuickActions() {
  const { theme, toggleTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const updateScroll = () => setIsScrolled(window.scrollY > 8);
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  return (
    <>
      <div
      className="dashboard-quick-actions sticky top-0 z-[80] flex h-14 items-center justify-end gap-2 bg-[var(--surface)] px-4"
      style={{
        borderBottom:
          theme === "dark" && isScrolled
            ? "1px solid rgba(250, 204, 21, 0.85)"
            : "1px solid transparent",
        boxShadow:
          theme === "dark" && isScrolled
            ? "0 2px 12px rgba(250, 204, 21, 0.22)"
            : "none",
        transition: "border-color 180ms ease, box-shadow 180ms ease",
      }}
    >
      <div className="mr-auto flex min-w-0 flex-col items-center justify-center gap-0.5" aria-label="Aviritech">
        <Image
          src="/brand/aviritech-logo.svg"
          alt=""
          width={30}
          height={20}
          priority
          className="h-[18px] w-auto object-contain"
        />
        <span className="text-[10px] font-bold leading-none tracking-wide text-[var(--foreground)]">
          Aviritech
        </span>
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
      >
        {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
      </button>

      <NotificationBell />
      </div>
      <NotificationActivityBar />
    </>
  );
}
