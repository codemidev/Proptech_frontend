"use client";

import type { ButtonProps } from "../../types/ui";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  loadingText,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  if (size === "icon" && !props["aria-label"]) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "Aviritech Button: icon-only buttons should provide an aria-label.",
      );
    }
  }

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex min-w-0 items-center justify-center gap-2 rounded-lg font-medium",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-yellow-400 text-black hover:bg-yellow-300",
        variant === "secondary" &&
          "bg-neutral-900 text-white hover:bg-neutral-800",
        variant === "outline" &&
          "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50",
        variant === "ghost" &&
          "bg-transparent text-neutral-800 hover:bg-neutral-100",
        variant === "danger" &&
          "bg-red-600 text-white hover:bg-red-500",
        variant === "success" &&
          "bg-green-600 text-white hover:bg-green-500",
        variant === "link" &&
          "bg-transparent text-neutral-900 underline-offset-4 hover:underline",
        size === "sm" && "min-h-9 px-3 text-sm",
        size === "md" && "min-h-10 px-4 text-sm",
        size === "lg" && "min-h-11 px-5 text-base",
        size === "icon" && "h-10 w-10 p-0",
        fullWidth && "w-full",
        className,
      )}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        <>
          {leftIcon}
          <span className={cn(size === "icon" && "sr-only")}>
            {children}
          </span>
          {rightIcon}
        </>
      )}
    </button>
  );
}

export default Button;
