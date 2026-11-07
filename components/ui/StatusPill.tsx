type StatusPillTone = "success" | "pending" | "danger" | "info";

type StatusPillProps = {
  tone: StatusPillTone;
  children: React.ReactNode;
};

const toneClasses: Record<StatusPillTone, string> = {
  success: "text-status-success-fg bg-status-success-bg",
  pending: "text-status-pending-fg bg-status-pending-bg",
  danger: "text-status-danger-fg bg-status-danger-bg",
  info: "text-status-info-fg bg-status-info-bg",
};

export function StatusPill({ tone, children }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
