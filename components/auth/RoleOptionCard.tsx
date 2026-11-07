"use client";

import { Check } from "lucide-react";
import type { RoleOption } from "@/lib/roles";

type RoleOptionCardProps = {
  option: RoleOption;
  selected: boolean;
  onSelect: (value: string) => void;
};

/**
 * Role choice used by sign-up and account provisioning.
 *
 * Colors are set explicitly rather than inherited: these pages force a
 * white background, while body text turns light under a dark OS theme.
 */
export function RoleOptionCard({ option, selected, onSelect }: RoleOptionCardProps) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(option.value)}
      className={`flex w-full items-start gap-3 rounded-xl border-2 bg-white p-4 text-left text-neutral-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ${
        selected
          ? "border-brand-yellow-dark bg-brand-yellow/15"
          : "border-black/10 hover:border-brand-yellow-dark"
      }`}
    >
      <span className="shrink-0 rounded-full bg-brand-yellow/25 p-2 text-neutral-900">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-neutral-900">{option.label}</span>
        <span className="mt-0.5 block text-xs text-neutral-600">{option.description}</span>
      </span>
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-neutral-900 bg-neutral-900 text-white" : "border-black/20"
        }`}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </span>
    </button>
  );
}
