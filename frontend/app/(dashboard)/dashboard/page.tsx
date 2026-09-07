"use client";

import ZeroTrainingDashboard from "../../../components/ZeroTrainingDashboard";
import SecureDashboard from "../../../components/SecureDashboard";
import { SAAS_DATA_MODE } from "../../../lib/hr/saasWorkforceClient";

export default function DashboardPage() {
  return SAAS_DATA_MODE ? <SecureDashboard /> : <ZeroTrainingDashboard />;
}
