import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function POST() {
  const backendUrl = new URL("/api/admin/clear-data", BACKEND_BASE_URL).toString();

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const text = await response.text();
    let data: unknown = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data && typeof data === "object" && "error" in data
              ? String((data as { error?: unknown }).error || "Backend veri temizleme hatası")
              : `Backend returned ${response.status}: ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { success: false, error: "Backend geçerli bir yanıt döndürmedi." },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Clear demo data proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Demo veri servisine ulaşılamadı." },
      { status: 502 }
    );
  }
}
