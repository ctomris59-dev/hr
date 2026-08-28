import { NextResponse } from "next/server";
import { getJobArchitectureRecord, listJobArchitectureRecords, searchJobArchitecture } from "@/lib/hr/jobArchitectureRegistry";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const position = url.searchParams.get("position")?.trim();
  const query = url.searchParams.get("q")?.trim() || "";
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 30)));

  if (position) {
    return NextResponse.json({ data: getJobArchitectureRecord(position) });
  }

  const data = query ? searchJobArchitecture(query, limit) : listJobArchitectureRecords().slice(0, limit);
  return NextResponse.json({ data, count: data.length });
}
