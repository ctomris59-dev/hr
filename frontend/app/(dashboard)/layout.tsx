import ClientLayout from "@/components/ClientLayout";
import RoleGuard from "@/components/RoleGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard>
      <ClientLayout>{children}</ClientLayout>
    </RoleGuard>
  );
}
