// app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 1. Fetch Agencies for the Table
    const agencies = await prisma.agency.findMany({
      include: {
        titles: {
          include: {
            title: {
              include: {
                snapshots: { orderBy: { effectiveDate: 'desc' }, take: 1 }
              }
            }
          }
        }
      }
    });

    // 2. Fetch Historical Data for the Chart (Aggregate of all Titles 1-5)
    // We get all snapshots and group them by date
    const allSnapshots = await prisma.regulationSnapshot.findMany({
      orderBy: { effectiveDate: 'asc' }
    });

    // Group by Date (Summing up word counts for that date)
    const historyMap: Record<string, { date: string; totalWords: number; avgRestrictions: number; count: number }> = {};

    allSnapshots.forEach(snap => {
      if (!historyMap[snap.effectiveDate]) {
        historyMap[snap.effectiveDate] = { 
            date: snap.effectiveDate, 
            totalWords: 0, 
            avgRestrictions: 0,
            count: 0
        };
      }
      historyMap[snap.effectiveDate].totalWords += snap.wordCount;
      historyMap[snap.effectiveDate].avgRestrictions += snap.restrictionDensityScore;
      historyMap[snap.effectiveDate].count += 1;
    });

    const historicalTrends = Object.values(historyMap).map(d => ({
        date: d.date,
        totalWords: d.totalWords,
        avgRestrictionScore: (d.avgRestrictions / d.count).toFixed(2)
    }));

    // 3. Process Agency Table Data
    const dashboardData = agencies.map((agency) => {
      const associatedTitles = agency.titles.map((at) => at.title);
      let totalWords = 0;
      let totalRestrictions = 0;
      let activeTitlesCount = 0;
      let lastUpdated: Date | null = null;

      associatedTitles.forEach((t) => {
        const latestSnapshot = t.snapshots[0];
        if (t.lastScraped) {
            const scrapeDate = new Date(t.lastScraped);
            if (!lastUpdated || scrapeDate > lastUpdated) lastUpdated = scrapeDate;
        }

        if (latestSnapshot) {
          activeTitlesCount++;
          totalWords += latestSnapshot.wordCount;
          totalRestrictions += latestSnapshot.restrictionDensityScore;
        }
      });

      return {
        id: agency.id,
        name: agency.name,
        totalTitles: associatedTitles.length,
        totalWordCount: totalWords.toLocaleString(),
        avgRestrictionScore: activeTitlesCount > 0 ? (totalRestrictions / activeTitlesCount).toFixed(2) : "0.00",
        lastUpdated: lastUpdated ? lastUpdated.toISOString().split('T')[0] : 'N/A'
      };
    });

    const activeAgencies = dashboardData.filter(a => a.totalTitles > 0);

    return NextResponse.json({
        agencies: activeAgencies,
        history: historicalTrends
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}