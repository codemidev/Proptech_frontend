import type { ReactNode } from "react";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

// Tenant-only styling (design tokens from the Figma tenant mobile UI).
// Deliberately separate from components/ui so other dashboards are unaffected.

export function tenantBtn(
  variant: "primary" | "outline" | "ghost" = "primary",
  extra?: string,
) {
  return cn(
    "inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]/40 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    variant === "primary" && "bg-[#FFE114] text-[#111827] hover:bg-[#F5D800]",
    variant === "outline" &&
      "border border-[#111827] bg-white text-[#111827] hover:bg-[#F5F6F7]",
    variant === "ghost" && "text-[#667085] hover:text-[#111827]",
    extra,
  );
}

export const tenantCard = "rounded-2xl border border-[#E2E5E9] bg-white";

const pillTones = {
  success: "bg-[#E9F7EF] text-[#277A59]",
  pending: "bg-[#FAF0D2] text-[#927633]",
  danger: "bg-[#FDE8E8] text-[#B42318]",
};

export function TenantPill({
  tone,
  children,
}: {
  tone: keyof typeof pillTones;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium",
        pillTones[tone],
      )}
    >
      {children}
    </span>
  );
}
