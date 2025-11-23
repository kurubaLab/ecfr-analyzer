// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { parseStringPromise } from 'xml2js';
import crypto from 'crypto';

const prisma = new PrismaClient();
const ECFR_API_BASE = 'https://www.ecfr.gov/api';

// --- HELPERS ---
function calculateChecksum(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}
function countRestrictions(text: string): number {
  const matches = text.match(/\b(shall|must|may not|required|prohibited)\b/gi);
  return matches ? matches.length : 0;
}

export async function POST(req: Request) {
  try {
    // 1. READ CONFIGURATION FROM REQUEST
    const body = await req.json();
    const mode = body.mode || 'demo'; // 'demo' or 'custom'
    
    // Default Defaults (Demo Mode)
    let targetTitles = [1, 2, 3, 4, 5];
    let snapshotLimit = 5;

    if (mode === 'custom') {
        // Parse comma-separated string "1, 14, 40" into array [1, 14, 40]
        if (body.titles) {
            targetTitles = body.titles
                .split(',')
                .map((t: string) => parseInt(t.trim()))
                .filter((n: number) => !isNaN(n));
        }
        if (body.limit) {
            snapshotLimit = parseInt(body.limit);
        }
    }

    console.log(`--- STARTING SEED [Mode: ${mode}] ---`);
    console.log(`Target Titles: ${targetTitles.join(', ')}`);
    console.log(`Snapshot Limit: ${snapshotLimit}`);

    // 2. CLEAR DATABASE
    // We clear everything to ensure a clean slate for the new configuration
    await prisma.regulationSnapshot.deleteMany();
    await prisma.agencyTitle.deleteMany();
    await prisma.regulationTitle.deleteMany();
    await prisma.agency.deleteMany();
    console.log("✅ Database Cleared");

    // 3. GLOBAL POPULATION (ALL Agencies & ALL Titles)
    // We always do this so the dropdowns/tables look complete
    
    // A. Agencies
    const agenciesRes = await fetch(`${ECFR_API_BASE}/admin/v1/agencies.json`);
    const agenciesData = await agenciesRes.json();
    const agenciesList = agenciesData.agencies || [];
    
    for (const agency of agenciesList) {
        const name = agency.name || agency.short_name;
        if (name) {
            await prisma.agency.upsert({
                where: { name: name },
                update: {},
                create: { name: name, slug: agency.slug }
            });
        }
    }
    console.log(`✅ ${agenciesList.length} Agencies Populated`);

    // B. Titles
    const titlesRes = await fetch(`${ECFR_API_BASE}/versioner/v1/titles.json`);
    const titlesData = await titlesRes.json();
    const titlesList = titlesData.titles || [];
    titlesList.sort((a: any, b: any) => a.number - b.number);

    for (const t of titlesList) {
        await prisma.regulationTitle.create({
            data: {
                titleNumber: t.number,
                titleName: t.name,
                snapshotDates: "[]",
                scrapeStatus: "PENDING"
            }
        });
    }
    console.log(`✅ ${titlesList.length} Titles Populated (Metadata)`);

    // C. Linking (Global)
    // We try to link ALL agencies to ALL titles using the API data
    console.log("... Linking Agencies (Global)");
    for (const agencyData of agenciesList) {
        const agencyName = agencyData.name || agencyData.short_name;
        const dbAgency = await prisma.agency.findUnique({ where: { name: agencyName }});
        
        if (dbAgency && agencyData.cfr_references) {
            for (const ref of agencyData.cfr_references) {
                if (ref.title && typeof ref.title === 'number') {
                    // We can safely link because we loaded ALL titles above
                    const titleExists = await prisma.regulationTitle.findUnique({ where: { titleNumber: ref.title }});
                    if (titleExists) {
                         await prisma.agencyTitle.upsert({
                            where: { agencyId_titleNumber: { agencyId: dbAgency.id, titleNumber: ref.title }},
                            update: {},
                            create: { agencyId: dbAgency.id, titleNumber: ref.title }
                        });
                    }
                }
            }
        }
    }

// Fallback: Ensure ACUS links to Title 1 if missed
    const acus = await prisma.agency.findFirst({ where: { name: { contains: "Administrative Conference" } } });
    if (acus) {
        // FIX: Use upsert instead of createMany because SQLite doesn't support skipDuplicates
        await prisma.agencyTitle.upsert({
            where: { 
                agencyId_titleNumber: { 
                    agencyId: acus.id, 
                    titleNumber: 1 
                } 
            },
            update: {}, // If it exists, do nothing
            create: { 
                agencyId: acus.id, 
                titleNumber: 1 
            }
        });
    }

    // 4. DEEP SCRAPE (Target Titles Only)
    // This is where we download the XML and do the math
    for (const tNum of targetTitles) {
        console.log(`Processing Target Title ${tNum}...`);
        
        // Check if title exists (user might have entered invalid number 999)
        const titleRecord = await prisma.regulationTitle.findUnique({ where: { titleNumber: tNum }});
        if (!titleRecord) {
            console.log(`   Skipping Title ${tNum} (Not found in eCFR)`);
            continue;
        }

        // A. Fetch Versions
        const versionsRes = await fetch(`${ECFR_API_BASE}/versioner/v1/versions/title-${tNum}.json`);
        const versionsData = await versionsRes.json();
        
        const rawDates = (versionsData.content_versions || []).map((v: any) => v.issue_date);
        const uniqueDates = Array.from(new Set(rawDates)) as string[];
        const allDates = uniqueDates.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());

        // Update Metadata
        await prisma.regulationTitle.update({
            where: { titleNumber: tNum },
            data: { snapshotDates: JSON.stringify(allDates) }
        });

        // B. Fetch XML (Limited by snapshotLimit)
        const datesToScrape = allDates.slice(0, snapshotLimit);

        for (const date of datesToScrape) {
            const xmlUrl = `${ECFR_API_BASE}/versioner/v1/full/${date}/title-${tNum}.xml`;
            console.log(`   Fetching XML for ${date}...`);
            
            try {
                const xmlRes = await fetch(xmlUrl);
                if (!xmlRes.ok) throw new Error(`Status ${xmlRes.status}`);
                
                const xmlText = await xmlRes.text();
                const parsed = await parseStringPromise(xmlText);
                const rawString = JSON.stringify(parsed); 

                const wCount = countWords(rawString);
                const rCount = countRestrictions(rawString);
                const check = calculateChecksum(rawString);
                const density = wCount > 0 ? (rCount / wCount) * 1000 : 0;

                await prisma.regulationSnapshot.create({
                    data: {
                        titleNumber: tNum,
                        effectiveDate: date,
                        wordCount: wCount,
                        restrictionCount: rCount,
                        checksum: check,
                        restrictionDensityScore: density
                    }
                });
                
                // Sleep 200ms to be polite to the API
                await new Promise(r => setTimeout(r, 200));

            } catch (err) {
                console.error(`   Failed ${date}`, err);
            }
        }

        // Mark as Completed
        await prisma.regulationTitle.update({
            where: { titleNumber: tNum },
            data: { scrapeStatus: "COMPLETED", lastScraped: new Date() }
        });
    }

    return NextResponse.json({ success: true, message: `Loaded Global Metadata + Deep Scrape for Titles: ${targetTitles.join(',')}` });

  } catch (error) {
    console.error("Seed Error:", error);
    return NextResponse.json({ message: "Error seeding database", error: String(error) }, { status: 500 });
  }
}