import { statusLabel } from "@/lib/agent-governance";

export function AgentStatusBadge({ status }: { status: string | null | undefined }) {
  const classes =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "PENDING_APPROVAL"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : status === "SUSPENDED"
          ? "bg-orange-50 text-orange-700 ring-orange-200"
          : status === "REJECTED"
            ? "bg-red-50 text-red-700 ring-red-200"
            : "bg-slate-50 text-slate-600 ring-slate-200";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${classes}`}>
      {statusLabel(status)}
    </span>
  );
}
