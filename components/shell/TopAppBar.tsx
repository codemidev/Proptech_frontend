"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

type TopAppBarProps = {
  title: string;
  onBack?: () => void;
};

export function TopAppBar({ title, onBack }: TopAppBarProps) {
  const router = useRouter();

  return (
    <header className="dashboard-top-app-bar sticky top-14 z-10 flex items-center gap-3 border-b border-black/5 bg-white px-4 py-4 text-slate-950">
      <button
        type="button"
        onClick={onBack ?? (() => router.back())}
        aria-label="Go back"
        className="rounded-full p-1 hover:bg-black/5"
      >
        <ChevronLeft size={22} />
      </button>

      <h1 className="flex-1 text-center text-base font-semibold pr-7">
        {title}
      </h1>
    </header>
  );
}
