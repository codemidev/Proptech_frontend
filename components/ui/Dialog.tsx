"use client";

import {
  useEffect,
  useId,
  useRef,
} from "react";

import type {
  DialogDescriptionProps,
  DialogFooterProps,
  DialogHeaderProps,
  DialogProps,
  DialogTitleProps,
} from "../../types/ui";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  destructive = false,
  closeLabel = "Close dialog",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  loading = false,
  className,
  initialFocusRef,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousActive =
      document.activeElement as HTMLElement | null;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const focusFirst = () => {
      const explicitTarget =
        initialFocusRef?.current;

      const first =
        dialogRef.current?.querySelector<HTMLElement>(
          FOCUSABLE_SELECTOR,
        );

      (explicitTarget ??
        first ??
        closeRef.current)?.focus();
    };

    const timeout = window.setTimeout(
      focusFirst,
      0,
    );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!closeOnEscape) return;

        event.preventDefault();
        onOpenChange(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusables =
        dialogRef.current?.querySelectorAll<HTMLElement>(
          FOCUSABLE_SELECTOR,
        );

      if (!focusables?.length) {
        event.preventDefault();
        closeRef.current?.focus();
        return;
      }

      const first = focusables[0];
      const last =
        focusables[focusables.length - 1];

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () => {
      window.clearTimeout(timeout);

      document.removeEventListener(
        "keydown",
        onKeyDown,
      );

      document.body.style.overflow =
        previousOverflow;

      previousActive?.focus?.();
    };
  }, [
    open,
    closeOnEscape,
    initialFocusRef,
    onOpenChange,
  ]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={() => {
          if (closeOnOverlayClick) {
            onOpenChange(false);
          }
        }}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={
          description
            ? descriptionId
            : undefined
        }
        className={cn(
          "relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-2xl",
          size === "xl" && "max-w-4xl",
          size === "full" &&
            "max-w-[calc(100vw-2rem)]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-5">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold text-neutral-950"
            >
              {title}
            </h2>

            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-sm text-neutral-500"
              >
                {description}
              </p>
            ) : null}
          </div>

          <button
            ref={closeRef}
            type="button"
            aria-label={closeLabel}
            onClick={() => onOpenChange(false)}
            className="shrink-0 rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
          >
            <span aria-hidden="true">
              ×
            </span>
          </button>
        </div>

        <div
          className={cn(
            "p-5",
            destructive &&
              "border-l-4 border-red-500",
          )}
          aria-busy={loading || undefined}
        >
          {loading ? (
            <div
              className="space-y-3"
              aria-label="Loading dialog content"
            >
              <div
                aria-hidden="true"
                className="h-4 animate-pulse rounded bg-neutral-100 motion-reduce:animate-none"
              />
              <div
                aria-hidden="true"
                className="h-4 w-2/3 animate-pulse rounded bg-neutral-100 motion-reduce:animate-none"
              />
            </div>
          ) : (
            children
          )}
        </div>

        {footer ? (
          <div className="border-t border-neutral-200 p-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DialogHeader({
  children,
  className,
}: DialogHeaderProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {children}
    </div>
  );
}

export function DialogTitle({
  children,
  className,
}: DialogTitleProps) {
  return (
    <h2
      className={cn(
        "text-lg font-semibold",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function DialogDescription({
  children,
  className,
}: DialogDescriptionProps) {
  return (
    <p
      className={cn(
        "text-sm text-neutral-500",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function DialogFooter({
  children,
  className,
}: DialogFooterProps) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default Dialog;
