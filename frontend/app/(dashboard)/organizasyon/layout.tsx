import type { ReactNode } from "react";
import OrganizationExcelDock from "../../../components/organization/OrganizationExcelDock";

export default function OrganizasyonLayout({ children }: { children: ReactNode }) {
  return <><OrganizationExcelDock />{children}</>;
}
