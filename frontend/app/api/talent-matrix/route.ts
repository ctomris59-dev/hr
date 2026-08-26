import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const backendUrl = new URL("/api/talent-matrix", BACKEND_BASE_URL);
  backendUrl.search = url.search;

  // Extract user role, department, and name from query parameters
  // and forward them as headers to the backend
  const userRole = url.searchParams.get("user_role");
  const userDept = url.searchParams.get("user_dept");
  const userName = url.searchParams.get("user_name");

  // Build headers object
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add user headers if they exist
  if (userRole) {
    headers["x-user-role"] = encodeURIComponent(userRole);
  }
  if (userDept) {
    headers["x-user-dept"] = encodeURIComponent(userDept);
  }
  if (userName) {
    headers["x-user-name"] = encodeURIComponent(userName);
  }

  try {
    // Forward cookies and authorization headers if present
    const cookie = request.headers.get("cookie");
    const authorization = request.headers.get("authorization");
    
    if (cookie) {
      headers["cookie"] = cookie;
    }
    if (authorization) {
      headers["authorization"] = authorization;
    }
    
    const response = await fetch(backendUrl.toString(), {
      cache: "no-store",
      credentials: "include", // Include cookies in CORS requests
      headers,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    // Check if response is OK
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`Backend returned ${response.status}:`, errorText);
      
      // DEVELOPMENT MODE: If 403, log warning but don't fail completely
      const isDevelopment = process.env.NODE_ENV === "development";
      if (isDevelopment && response.status === 403) {
        console.warn("[DEV] Talent Matrix returned 403 - auth bypass should prevent this. Returning empty data.");
        return NextResponse.json(
          { 
            success: true, 
            data: [],
            warning: "Development mode: 403 bypassed, returning empty data"
          },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Backend error: ${response.status} ${response.statusText}`,
          details: errorText.substring(0, 500) // Limit error text length
        },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    // Try to parse JSON
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      const text = await response.text();
      console.error("Failed to parse backend response as JSON:", text);
      return NextResponse.json(
        { 
          success: false, 
          error: "Backend returned invalid JSON response",
          details: text.substring(0, 500)
        },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    // Handle network errors, timeouts, etc.
    console.error("Talent matrix proxy error:", error);
    
    let errorMessage = "Failed to reach backend";
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      errorMessage = "Backend request timeout (30s)";
    } else if (error.message) {
      errorMessage = `Network error: ${error.message}`;
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        backend_url: backendUrl.toString(),
        hint: "Make sure the backend server is running on " + BACKEND_BASE_URL
      },
      { status: 502 }
    );
  }
}
