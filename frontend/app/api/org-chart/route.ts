import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const backendUrl = new URL("/api/org-chart", BACKEND_BASE_URL);
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
    headers["x-user-role"] = userRole;
  }
  if (userDept) {
    headers["x-user-dept"] = userDept;
  }
  if (userName) {
    headers["x-user-name"] = userName;
  }

  try {
    const response = await fetch(backendUrl.toString(), {
      cache: "no-store",
      headers,
    });
    const data = await response.json().catch(() => null);

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Invalid backend response" },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Org chart proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reach backend" },
      { status: 502 }
    );
  }
}
