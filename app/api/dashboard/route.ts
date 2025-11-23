// app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch all Agencies with their Titles and the LATEST Snapshot for each title
    const agencies = await prisma.agency.findMany({
      include: {
        titles: {
          include: {
            title: {
              include: {
                snapshots: {
                  orderBy: { effectiveDate: 'desc' },
                  take: 1 // Only get the most recent snapshot
                }
              }
            }
          }
        }
      }
    });

    // Transform the data for the Dashboard Table
    const dashboardData = agencies.map((agency) => {
      const associatedTitles = agency.titles.map((at) => at.title);
      
      let totalWords = 0;
      let totalRestrictions = 0;
      let activeTitlesCount = 0;
      let lastUpdated: Date | null = null;

      associatedTitles.forEach((t) => {
        const latestSnapshot = t.snapshots[0];
        
        // Track the most recent scrape date
        if (t.lastScraped) {
            const scrapeDate = new Date(t.lastScraped);
            if (!lastUpdated || scrapeDate > lastUpdated) {
                lastUpdated = scrapeDate;
            }
        }

        if (latestSnapshot) {
          activeTitlesCount++;
          totalWords += latestSnapshot.wordCount;
          // Calculate restriction density for this title to average later
          // Formula: (RestrictionCount / WordCount) * 1000
          // But here we might just sum raw restrictions and avg the score? 
          // The SRD asks for "Avg Restriction Density Score". 
          // Let's sum the scores and divide by count of titles.
          totalRestrictions += latestSnapshot.restrictionDensityScore;
        }
      });

      const avgDensity = activeTitlesCount > 0 
        ? (totalRestrictions / activeTitlesCount).toFixed(2) 
        : "0.00";

      return {
        id: agency.id,
        name: agency.name,
        slug: agency.slug,
        totalTitles: associatedTitles.length,
        totalWordCount: totalWords.toLocaleString(), // Format with commas
        avgRestrictionScore: avgDensity,
        lastUpdated: lastUpdated ? lastUpdated.toISOString().split('T')[0] : 'N/A'
      };
    });

    // Filter out agencies with 0 titles to keep the view clean (optional)
    const activeAgencies = dashboardData.filter(a => a.totalTitles > 0);

    return NextResponse.json(activeAgencies);
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}