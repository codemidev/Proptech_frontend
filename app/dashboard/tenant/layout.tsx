import { DM_Sans } from "next/font/google";
import { BottomTabBar } from "@/components/shell/BottomTabBar";

const dmSans = DM_Sans({ subsets: ["latin"] });

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${dmSans.className} min-h-screen bg-[var(--background)] pb-20 text-[var(--foreground)]`}>
      {children}
      <BottomTabBar />
    </div>
  );
}
