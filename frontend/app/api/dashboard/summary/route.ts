import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function GET() {
  const backendUrl = new URL("/api/dashboard/summary", BACKEND_BASE_URL).toString();

  try {
    const response = await fetch(backendUrl, { cache: "no-store" });
    const data = await response.json().catch(() => null);

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Invalid backend response" },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Dashboard summary proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reach backend" },
      { status: 502 }
    );
  }
}
