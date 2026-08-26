import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  const backendUrl = new URL("/api/admin/generate-rich-demo", BACKEND_BASE_URL).toString();

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });

    // Check if response is ok before parsing
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return NextResponse.json(
        { 
          success: false, 
          error: `Backend returned ${response.status}: ${response.statusText}`,
          error_type: "HTTPError",
          traceback: errorText.substring(0, 500)
        },
        { status: response.status }
      );
    }

    // Try to parse JSON response
    let data;
    try {
      const text = await response.text();
      if (!text || text.trim() === "") {
        return NextResponse.json(
          { 
            success: false, 
            error: "Backend returned empty response",
            error_type: "EmptyResponse"
          },
          { status: 502 }
        );
      }
      data = JSON.parse(text);
    } catch (parseError: any) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid JSON response from backend",
          error_type: "ParseError",
          traceback: parseError?.message || "Unknown parse error"
        },
        { status: 502 }
      );
    }

    // Ensure data has expected structure
    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid response format from backend",
          error_type: "InvalidFormat"
        },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("Generate rich demo proxy error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Failed to reach backend",
        error_type: "NetworkError",
        traceback: error?.stack?.substring(0, 500) || ""
      },
      { status: 502 }
    );
  }
}
