import type {
  CardBodyProps,
  CardFooterProps,
  CardHeaderProps,
  CardProps,
} from "../../types/ui";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Card({
  variant = "default",
  padding = "md",
  as = "div",
  interactive = false,
  href,
  onClick,
  role,
  children,
  className,
  tabIndex,
  onKeyDown,
  ...props
}: CardProps) {
  const Component = as;

  const interactiveProps =
    interactive
      ? {
          role: role ?? (href ? "link" : "button"),
          tabIndex: tabIndex ?? 0,
          onClick,
          onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (
              (event.key === "Enter" || event.key === " ") &&
              onClick
            ) {
              event.preventDefault();
              onClick();
            }

            onKeyDown?.(event);
          },
          "aria-disabled": props["aria-disabled"],
        }
      : {};

  return (
    <Component
      {...props}
      {...interactiveProps}
      {...(href ? { "data-href": href } : {})}
      className={cn(
        "rounded-xl bg-white text-neutral-950",
        "border border-neutral-200",
        variant === "default" && "shadow-sm",
        variant === "elevated" && "shadow-md",
        variant === "outlined" && "shadow-none",
        variant === "interactive" &&
          "cursor-pointer shadow-sm transition-shadow hover:shadow-md",
        variant === "danger" && "border-red-200",
        variant === "success" && "border-green-200",
        interactive &&
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2",
        padding === "none" && "p-0",
        padding === "sm" && "p-3",
        padding === "md" && "p-4",
        padding === "lg" && "p-6",
        className,
      )}
    >
      {children}
    </Component>
  );
}

export function CardHeader({
  title,
  description,
  action,
  children,
  className,
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-neutral-100 pb-4",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="font-semibold text-neutral-950">
          {title}
        </div>

        {description ? (
          <div className="mt-1 text-sm text-neutral-500">
            {description}
          </div>
        ) : null}

        {children}
      </div>

      {action ? (
        <div className="shrink-0">
          {action}
        </div>
      ) : null}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: CardBodyProps) {
  return (
    <div className={cn("pt-4", className)}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
}: CardFooterProps) {
  return (
    <div
      className={cn(
        "mt-4 border-t border-neutral-100 pt-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default Card;
