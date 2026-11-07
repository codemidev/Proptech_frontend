"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export function DialogShell({ title, onClose, children, maxWidth = "max-w-lg" }: { title: string; onClose: () => void; children: ReactNode; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} rounded-3xl bg-white p-5 shadow-2xl sm:p-6`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50" aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DialogError({ children }: { children: ReactNode }) {
  return <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}

export function DialogActions({ submitting, disabled = false, onClose, onSubmit, submitLabel, variant = "dark" }: { submitting: boolean; disabled?: boolean; onClose: () => void; onSubmit: () => void; submitLabel: string; variant?: "dark" | "red" | "orange" | "green" }) {
  const button = variant === "red" ? "bg-red-600" : variant === "orange" ? "bg-orange-600" : variant === "green" ? "bg-emerald-600" : "bg-slate-950";
  return (
    <div className="mt-5 flex gap-2">
      <button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
      <button type="button" onClick={onSubmit} disabled={submitting || disabled} className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${button} disabled:opacity-60`}>
        {submitting ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}
