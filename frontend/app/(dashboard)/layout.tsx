import { redirect } from "next/navigation";
import ClientLayout from "@/components/ClientLayout";
import RoleGuard from "@/components/RoleGuard";
import SaasStorageGate from "@/components/SaasStorageGate";
import CustomerLanguageRuntime from "@/components/CustomerLanguageRuntime";
import ProductCompletionLayer from "@/components/ProductCompletionLayer";
import { hasSessionCookie, isSaasMode } from "@/lib/saasAuthServer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Demo mode deliberately remains local and frictionless. In SaaS mode the
  // dashboard is never rendered unless an HttpOnly access/refresh session exists.
  if (isSaasMode() && !(await hasSessionCookie())) {
    redirect("/sistem-girisi");
  }

  return (
    <RoleGuard>
      <SaasStorageGate>
        <ClientLayout>
          <CustomerLanguageRuntime />
          {children}
          <ProductCompletionLayer />
        </ClientLayout>
      </SaasStorageGate>
    </RoleGuard>
  );
}
