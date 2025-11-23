// app/api/history/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const titleNumber = searchParams.get('title');

  if (!titleNumber) {
    return NextResponse.json({ error: "Title number required" }, { status: 400 });
  }

  // Fetch all snapshots for this title, sorted by date
  const history = await prisma.regulationSnapshot.findMany({
    where: { titleNumber: parseInt(titleNumber) },
    orderBy: { effectiveDate: 'asc' }, // Ascending for charts (Oldest -> Newest)
  });

  return NextResponse.json(history);
}