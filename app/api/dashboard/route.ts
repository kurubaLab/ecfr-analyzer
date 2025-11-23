// app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch ALL Titles with their Agencies and Snapshots
    const titles = await prisma.regulationTitle.findMany({
      orderBy: { titleNumber: 'asc' },
      include: {
        agencies: {
          include: { agency: true } // Get the Agency names
        },
        snapshots: {
          orderBy: { effectiveDate: 'desc' } // Newest first
        }
      }
    });

    // Transform for the Frontend
    const formattedTitles = titles.map(t => {
      const latest = t.snapshots[0]; // The most recent scrape
      const agencyNames = t.agencies.map(a => a.agency.name).join(", ");
      
      // Determine if this is "Metadata Only" or "Analyzed"
      const isAnalyzed = t.snapshots.length > 0;

      return {
        id: t.titleNumber,
        number: t.titleNumber,
        name: t.titleName,
        agencies: agencyNames || "Various Agencies",
        isAnalyzed: isAnalyzed,
        
        // Current Metrics (or 0 if not analyzed)
        currentWordCount: latest ? latest.wordCount.toLocaleString() : "—",
        currentRestrictionScore: latest ? latest.restrictionDensityScore.toFixed(2) : "—",
        lastUpdated: latest ? latest.effectiveDate : "Metadata Only",
        
        // Full History for Drill-down & Charts
        history: t.snapshots.map(s => ({
            date: s.effectiveDate,
            wordCount: s.wordCount,
            restrictionScore: s.restrictionDensityScore.toFixed(2),
            checksum: s.checksum
        }))
      };
    });

    return NextResponse.json(formattedTitles);
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}