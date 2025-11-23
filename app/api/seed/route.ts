// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { parseStringPromise } from 'xml2js';
import crypto from 'crypto';

const prisma = new PrismaClient();

// CONSTANTS
const ECFR_API_BASE = 'https://www.ecfr.gov/api';

// Helper: Calculate SHA-256 Checksum
function calculateChecksum(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Helper: Count words
function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

// Helper: Count restrictions (shall, must, etc.)
function countRestrictions(text: string): number {
  const matches = text.match(/\b(shall|must|may not|required|prohibited)\b/gi);
  return matches ? matches.length : 0;
}

export async function POST() {
  try {
    console.log("--- STARTING DATABASE RESET & SEED ---");

    // 1. CLEAR DATABASE (Order matters because of foreign keys)
    await prisma.regulationSnapshot.deleteMany();
    await prisma.agencyTitle.deleteMany();
    await prisma.regulationTitle.deleteMany();
    await prisma.agency.deleteMany();
    
    console.log("✅ Database Cleared");

    // 2. FETCH AGENCIES
    // Using the 'admin/v1/agencies.json' endpoint to get the list
    const agenciesRes = await fetch(`${ECFR_API_BASE}/admin/v1/agencies.json`);
    const agenciesData = await agenciesRes.json();
    const agenciesList = agenciesData.agencies || [];

    console.log(`Found ${agenciesList.length} agencies.`);

    // 3. POPULATE AGENCIES
    for (const agency of agenciesList) {
        // Some names might be duplicates in the API, so we use upsert or ignore
        const name = agency.name || agency.short_name;
        if (name) {
            await prisma.agency.upsert({
                where: { name: name },
                update: {},
                create: { 
                    name: name,
                    slug: agency.slug // We might need this for linking
                }
            });
        }
    }
    console.log("✅ Agencies Populated");

    // 4. FETCH TITLES & LINK TO AGENCIES
    // The titles.json usually just gives a list of titles.
    const titlesRes = await fetch(`${ECFR_API_BASE}/versioner/v1/titles.json`);
    const titlesData = await titlesRes.json();
    const titlesList = titlesData.titles || [];

    // Sort by title number so we process 1, 2, 3... in order
    titlesList.sort((a: any, b: any) => a.number - b.number);

    // Insert Titles
    for (const t of titlesList) {
        await prisma.regulationTitle.create({
            data: {
                titleNumber: t.number,
                titleName: t.name,
                snapshotDates: "[]", // Will populate later for first 5
            }
        });
    }
    console.log(`✅ ${titlesList.length} Titles Created`);

    // 5. LINK AGENCIES TO TITLES
    // The agencies.json response often contains a "references" or "titles" array.
    // For simplicity in this assignment, we will assume the 'agencies' endpoint provided the links, 
    // or we match broadly. 
    // *Correction for Scraper Logic*: The SRD says /v1/agencies.json provides an array of titleNumbers.
    // Let's re-process the agency list to create the links.
    
    for (const agencyData of agenciesList) {
        const agencyName = agencyData.name || agencyData.short_name;
        const dbAgency = await prisma.agency.findUnique({ where: { name: agencyName }});
        
        if (dbAgency && agencyData.references) {
            // references often looks like [{ title: 1, ...}, { title: 5, ...}]
            for (const ref of agencyData.references) {
                if (ref.title) {
                    // Create link if title exists
                    const titleExists = await prisma.regulationTitle.findUnique({ where: { titleNumber: ref.title }});
                    if (titleExists) {
                        // Avoid duplicate PK errors
                        const linkExists = await prisma.agencyTitle.findUnique({
                            where: { agencyId_titleNumber: { agencyId: dbAgency.id, titleNumber: ref.title }}
                        });

                        if (!linkExists) {
                            await prisma.agencyTitle.create({
                                data: {
                                    agencyId: dbAgency.id,
                                    titleNumber: ref.title
                                }
                            });
                        }
                    }
                }
            }
        }
    }
    console.log("✅ Agency-Title Links Created");

    // 6. PROCESS SNAPSHOTS (First 5 Titles Only)
    const TITLES_TO_PROCESS = 5;
    const SNAPSHOTS_PER_TITLE = 3;

    for (let i = 0; i < TITLES_TO_PROCESS; i++) {
        const title = titlesList[i];
        if (!title) break;

        console.log(`Processing Title ${title.number}...`);

        // A. Fetch available versions (dates) for this title
        // Endpoint: /versioner/v1/versions/title-{number}.json
        const versionsRes = await fetch(`${ECFR_API_BASE}/versioner/v1/versions/title-${title.number}.json`);
        const versionsData = await versionsRes.json();
      
        // // Extract dates (issue_date) and sort descending (newest first)
        // const allDates = (versionsData.content_versions || [])
        //     .map((v: any) => v.issue_date)
        //     .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());
        
        // Extract dates, DEDUPLICATE them, and sort descending
        const rawDates = (versionsData.content_versions || []).map((v: any) => v.issue_date);
        const uniqueDates = Array.from(new Set(rawDates)) as string[]; // Remove duplicates
        
        const allDates = uniqueDates.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());


        // Update the Title record with ALL dates (as JSON string)
        await prisma.regulationTitle.update({
            where: { titleNumber: title.number },
            data: { snapshotDates: JSON.stringify(allDates) }
        });

        // B. Fetch XML for the top 3 dates
        const datesToScrape = allDates.slice(0, SNAPSHOTS_PER_TITLE);

        for (const date of datesToScrape) {
             // Endpoint: /versioner/v1/full/{date}/title-{number}.xml
             const xmlUrl = `${ECFR_API_BASE}/versioner/v1/full/${date}/title-${title.number}.xml`;
             console.log(`   Fetching XML for ${date}...`);
             
             try {
                 const xmlRes = await fetch(xmlUrl);
                 const xmlText = await xmlRes.text();

                 // Parse XML to get raw text (removes tags roughly)
                 const parsed = await parseStringPromise(xmlText);
                 // JSON.stringify is a quick way to flatten the XML object to text for counting
                 const rawString = JSON.stringify(parsed); 

                 // Calculate Metrics
                 const wCount = countWords(rawString);
                 const rCount = countRestrictions(rawString);
                 const check = calculateChecksum(rawString);
                 const density = wCount > 0 ? (rCount / wCount) * 1000 : 0;

                 // Save Snapshot
                 await prisma.regulationSnapshot.create({
                     data: {
                         titleNumber: title.number,
                         effectiveDate: date,
                         wordCount: wCount,
                         restrictionCount: rCount,
                         checksum: check,
                         restrictionDensityScore: density
                     }
                 });

             } catch (err) {
                 console.error(`   Failed to fetch/parse ${date} for Title ${title.number}`, err);
             }
        }
        
        // Mark as Scraped
        await prisma.regulationTitle.update({
            where: { titleNumber: title.number },
            data: { 
                scrapeStatus: "COMPLETED",
                lastScraped: new Date()
            }
        });
    }

    return NextResponse.json({ message: "Database Initialized Successfully", success: true });
  } catch (error) {
    console.error("Seed Error:", error);
    return NextResponse.json({ message: "Error seeding database", error: String(error) }, { status: 500 });
  }
}