import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/saasAuthServer";

export async function GET() {
  try {
    const response = await backendFetch("/api/v1/auth/status");
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) {
      return NextResponse.json({ ready: false, secure_auth_enabled: false, database_configured: false });
    }
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ ready: false, secure_auth_enabled: false, database_configured: false });
  }
}
