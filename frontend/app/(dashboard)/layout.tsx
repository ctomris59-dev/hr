import ClientLayout from "@/components/ClientLayout";
import RoleGuard from "@/components/RoleGuard";
import DemoRoleSwitcher from "@/components/DemoRoleSwitcher";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dashboard layout with sidebar and navbar
  return (
    <RoleGuard>
      <ClientLayout>{children}</ClientLayout>
      <DemoRoleSwitcher />
    </RoleGuard>
  );
}

