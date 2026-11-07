import Link from "next/link";
import { Building2 } from "lucide-react";

type LogoProps = {
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
};

const sizeClasses = {
  sm: { mark: "h-7 w-7", icon: 14, text: "text-base" },
  md: { mark: "h-9 w-9", icon: 18, text: "text-xl" },
  lg: { mark: "h-14 w-14", icon: 28, text: "text-2xl" },
};

export function Logo({
  variant = "dark",
  size = "md",
  href = "/",
  className = "",
}: LogoProps) {
  const { mark, icon, text } = sizeClasses[size];
  const isLight = variant === "light";

  return (
    <Link
      href={href}
      aria-label="Aviritech PropTech home"
      className={`group inline-flex items-center gap-2.5 ${className}`}
    >
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-yellow text-navy transition-transform group-hover:scale-105 ${mark}`}
      >
        <Building2 size={icon} strokeWidth={2.25} />
      </span>

      <span
        className={`font-bold tracking-tight ${text} ${isLight ? "text-white" : "text-navy"}`}
      >
        Aviritech
        <span className="text-brand-yellow-dark">PropTech</span>
      </span>
    </Link>
  );
}
