import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const backendUrl = new URL("/api/360-data", BACKEND_BASE_URL);
  backendUrl.search = url.search;

  try {
    const response = await fetch(backendUrl.toString(), { cache: "no-store" });
    const data = await response.json().catch(() => null);

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Invalid backend response" },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("360 data proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reach backend" },
      { status: 502 }
    );
  }
}
