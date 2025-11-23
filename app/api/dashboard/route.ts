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
        
        // CHANGE: Return the array, not just the string
        agencies: t.agencies.map(a => a.agency.name), 
        
        isAnalyzed: isAnalyzed,
        currentWordCount: latest ? latest.wordCount : 0, // Return Number for math
        currentRestrictionScore: latest ? latest.restrictionDensityScore : 0, // Return Number
        lastUpdated: latest ? latest.effectiveDate : "Metadata Only",
        
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