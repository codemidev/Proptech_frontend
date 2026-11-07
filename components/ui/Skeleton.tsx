import type { SkeletonProps } from "../../types/ui";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Skeleton({
  variant = "rect",
  width,
  height,
  rounded = true,
  animate = true,
  animation = "pulse",
  className,
  style,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: "h-4 w-full",
    title: "h-6 w-2/3",
    avatar: "h-10 w-10",
    rect: "h-24 w-full",
    card: "h-40 w-full",
    "table-row": "h-10 w-full",
  };

  const animationClass =
    !animate || animation === "none"
      ? ""
      : animation === "pulse"
        ? "animate-pulse motion-reduce:animate-none"
        : "animate-pulse motion-reduce:animate-none";

  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn(
        "bg-neutral-100",
        rounded && "rounded-md",
        animationClass,
        variantClasses[variant],
        className,
      )}
      style={{
        width,
        height,
        ...style,
      }}
    />
  );
}

export function SkeletonCard({
  lines = 3,
  showAvatar = false,
  showActions = false,
  animate = true,
  className,
}: {
  lines?: number;
  showAvatar?: boolean;
  showActions?: boolean;
  animate?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-4",
        className,
      )}
      aria-hidden="true"
    >
      {showAvatar ? (
        <Skeleton
          variant="avatar"
          animate={animate}
        />
      ) : null}

      <div className="mt-4 space-y-2">
        <Skeleton
          variant="title"
          animate={animate}
        />

        {Array.from({ length: lines }).map(
          (_, index) => (
            <Skeleton
              key={index}
              variant="text"
              animate={animate}
            />
          ),
        )}
      </div>

      {showActions ? (
        <div className="mt-4 flex gap-2">
          <Skeleton
            width={90}
            height={36}
            animate={animate}
          />
          <Skeleton
            width={90}
            height={36}
            animate={animate}
          />
        </div>
      ) : null}
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  animate = true,
  className,
}: {
  rows?: number;
  columns?: number;
  animate?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-2",
        className,
      )}
      aria-hidden="true"
    >
      {Array.from({ length: rows }).map(
        (_, row) => (
          <div
            key={row}
            className="grid gap-3"
            style={{
              gridTemplateColumns:
                `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({
              length: columns,
            }).map((_, column) => (
              <Skeleton
                key={column}
                variant="table-row"
                animate={animate}
              />
            ))}
          </div>
        ),
      )}
    </div>
  );
}

export default Skeleton;
