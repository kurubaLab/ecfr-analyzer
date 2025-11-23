// app/api/admin/dates/route.ts
import { NextResponse } from 'next/server';

const ECFR_API_BASE = 'https://www.ecfr.gov/api';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title');

  if (!title) {
    return NextResponse.json({ error: "Title number required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${ECFR_API_BASE}/versioner/v1/versions/title-${title}.json`);
    if (!res.ok) throw new Error("Failed to fetch dates from eCFR");

    const data = await res.json();
    
    // Extract dates and deduplicate
    const rawDates = (data.content_versions || []).map((v: any) => v.issue_date);
    const uniqueDates = Array.from(new Set(rawDates)) as string[];
    
    // Sort newest first
    const sortedDates = uniqueDates.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());

    return NextResponse.json({ dates: sortedDates });
  } catch (error) {
    return NextResponse.json({ error: "Could not fetch dates" }, { status: 500 });
  }
}