import { NextResponse } from "next/server";
import { clearSession, fetchWithSession } from "@/lib/saasAuthServer";

export async function POST() {
  try {
    const response = await fetchWithSession("/api/v1/auth/logout-all", { method: "POST" });
    await clearSession();
    if (response && !response.ok && response.status !== 401) {
      return NextResponse.json({ success: false }, { status: response.status });
    }
    return NextResponse.json({ success: true });
  } catch {
    await clearSession();
    return NextResponse.json({ success: true });
  }
}
