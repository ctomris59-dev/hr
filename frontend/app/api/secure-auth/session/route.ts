import { NextResponse } from "next/server";
import { clearSession, fetchWithSession } from "@/lib/saasAuthServer";

export async function GET() {
  try {
    const response = await fetchWithSession("/api/v1/auth/me");
    if (!response) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) {
      await clearSession();
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, user: payload });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
