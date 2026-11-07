import { DashboardQuickActions } from "@/components/shell/DashboardQuickActions";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardQuickActions />
      {children}
    </>
  );
}
