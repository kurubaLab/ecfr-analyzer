// app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch Titles with Agencies and Analyzed Snapshots
    const titles = await prisma.regulationTitle.findMany({
      orderBy: { titleNumber: 'asc' },
      include: {
        agencies: {
          include: { agency: true }
        },
        snapshots: {
          orderBy: { effectiveDate: 'desc' }
        }
      }
    });

    const formattedTitles = titles.map(t => {
      const latest = t.snapshots[0];
      const agencyNames = t.agencies.map(a => a.agency.name);
      
      const isAnalyzed = t.snapshots.length > 0;

      // --- NEW MERGE LOGIC ---
      // 1. Parse the full list of available dates (Metadata)
      let allDates: string[] = [];
      try {
        allDates = JSON.parse(t.snapshotDates || "[]");
      } catch (e) {
        allDates = [];
      }

      // 2. Create a Map of analyzed snapshots for quick lookup
      const analyzedMap = new Map();
      t.snapshots.forEach(s => analyzedMap.set(s.effectiveDate, s));

      // 3. Build the merged history (All dates, populated where possible)
      const mergedHistory = allDates.map(date => {
        const analyzed = analyzedMap.get(date);
        return {
            date: date,
            isLoaded: !!analyzed, // Boolean flag for the UI
            wordCount: analyzed ? analyzed.wordCount : 0,
            restrictionScore: analyzed ? analyzed.restrictionDensityScore.toFixed(2) : "—",
            checksum: analyzed ? analyzed.checksum : "—"
        };
      });
      // -----------------------

      return {
        id: t.titleNumber,
        number: t.titleNumber,
        name: t.titleName,
        agencies: agencyNames,
        isAnalyzed: isAnalyzed,
        currentWordCount: latest ? latest.wordCount : 0,
        currentRestrictionScore: latest ? latest.restrictionDensityScore : 0,
        lastUpdated: latest ? latest.effectiveDate : "Metadata Only",
        history: mergedHistory // Return the merged list
      };
    });

    return NextResponse.json(formattedTitles);
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}