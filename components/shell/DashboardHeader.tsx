import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/ui/Logo";

type DashboardHeaderProps = {
  subtitle: string;
  children?: React.ReactNode;
};

export function DashboardHeader({ subtitle, children }: DashboardHeaderProps) {
  return (
    <header className="border-b border-white/10 bg-navy text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div>
          <Logo variant="light" size="sm" />
          <p className="mt-1 text-sm text-white/50">{subtitle}</p>
        </div>

        <div className="flex items-center gap-4">
          {children}
          <UserButton />
        </div>
      </div>
    </header>
  );
}
