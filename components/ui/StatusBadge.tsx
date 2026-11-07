import type { StatusBadgeProps } from "../../types/ui";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function StatusBadge({
  label,
  tone = "neutral",
  size = "sm",
  dot = false,
  icon,
  iconDecorative = true,
  iconAriaLabel,
  srLabel,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" &&
          "px-2 py-0.5 text-xs",
        size === "md" &&
          "px-2.5 py-1 text-sm",
        tone === "neutral" &&
          "border-neutral-200 bg-neutral-50 text-neutral-700",
        tone === "info" &&
          "border-blue-200 bg-blue-50 text-blue-700",
        tone === "success" &&
          "border-green-200 bg-green-50 text-green-700",
        tone === "warning" &&
          "border-yellow-200 bg-yellow-50 text-yellow-800",
        tone === "danger" &&
          "border-red-200 bg-red-50 text-red-700",
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-current"
        />
      ) : null}

      {icon ? (
        <span
          aria-hidden={
            iconDecorative ? true : undefined
          }
          aria-label={
            iconDecorative
              ? undefined
              : iconAriaLabel
          }
        >
          {icon}
        </span>
      ) : null}

      <span>{label}</span>

      {srLabel ? (
        <span className="sr-only">
          {srLabel}
        </span>
      ) : null}
    </span>
  );
}

export default StatusBadge;
