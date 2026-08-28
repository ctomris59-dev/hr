"use client";

import OrganizationExcelExchange from "./OrganizationExcelExchange";
import SalaryExcelExchange from "../salary/SalaryExcelExchange";

export default function BulkExcelRouteTools({ pathname }: { pathname: string }) {
  if (pathname === "/organizasyon") return <OrganizationExcelExchange />;
  if (pathname === "/maas") return <SalaryExcelExchange />;
  return null;
}
