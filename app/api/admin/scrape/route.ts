// app/api/admin/scrape/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { parseStringPromise } from 'xml2js';
import crypto from 'crypto';

const prisma = new PrismaClient();
const ECFR_API_BASE = 'https://www.ecfr.gov/api';

// Helpers (Same as before)
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
        const body = await req.json();
        const { titleNumber, dates } = body; // Expects: { titleNumber: 1, dates: ['2024-01-01'] }

        if (!titleNumber || !dates || !Array.isArray(dates)) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        console.log(`Scraping Title ${titleNumber} for dates: ${dates.join(', ')}`);

        for (const date of dates) {
            // Check if already loaded to avoid duplicates
            const exists = await prisma.regulationSnapshot.findUnique({
                where: { titleNumber_effectiveDate: { titleNumber, effectiveDate: date }}
            });
            if (exists) {
                console.log(`Skipping ${date} (Already loaded)`);
                continue;
            }

            // Fetch XML
            const xmlUrl = `${ECFR_API_BASE}/versioner/v1/full/${date}/title-${titleNumber}.xml`;
            const xmlRes = await fetch(xmlUrl);
            if (!xmlRes.ok) continue;

            const xmlText = await xmlRes.text();
            const parsed = await parseStringPromise(xmlText);
            const rawString = JSON.stringify(parsed); 

            // Calculate Metrics
            const wCount = countWords(rawString);
            const rCount = countRestrictions(rawString);
            const check = calculateChecksum(rawString);
            const density = wCount > 0 ? (rCount / wCount) * 1000 : 0;

            await prisma.regulationSnapshot.create({
                data: {
                    titleNumber: titleNumber,
                    effectiveDate: date,
                    wordCount: wCount,
                    restrictionCount: rCount,
                    checksum: check,
                    restrictionDensityScore: density
                }
            });
        }
        
        // Update Metadata
        await prisma.regulationTitle.update({
            where: { titleNumber },
            data: { 
                scrapeStatus: "COMPLETED", 
                lastScraped: new Date() 
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}