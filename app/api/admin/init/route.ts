// app/api/admin/init/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ECFR_API_BASE = 'https://www.ecfr.gov/api';

export async function POST(req: Request) {
  try {
    // 1. Check if "Factory Reset" is requested
    const body = await req.json().catch(() => ({})); // Handle empty body safely
    const shouldReset = body.reset === true;

    console.log(`--- STARTING METADATA INIT (Reset: ${shouldReset}) ---`);

    if (shouldReset) {
        console.log("⚠️ WIPING DATABASE...");
        // Delete in order to respect Foreign Keys
        await prisma.regulationSnapshot.deleteMany(); // Delete Text/Metrics
        await prisma.agencyTitle.deleteMany();        // Delete Links
        await prisma.regulationTitle.deleteMany();    // Delete Titles
        await prisma.agency.deleteMany();             // Delete Agencies
        console.log("✅ Database Wiped Clean");
    }

    // 2. GET AGENCIES
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

    // 3. GET TITLES
    const titlesRes = await fetch(`${ECFR_API_BASE}/versioner/v1/titles.json`);
    const titlesData = await titlesRes.json();
    const titlesList = titlesData.titles || [];

    for (const t of titlesList) {
        await prisma.regulationTitle.upsert({
            where: { titleNumber: t.number },
            update: { titleName: t.name }, // Update name if changed
            create: { 
                titleNumber: t.number, 
                titleName: t.name, 
                snapshotDates: "[]" 
            }
        });
    }

    // 4. LINK AGENCIES TO TITLES
    for (const agencyData of agenciesList) {
        const agencyName = agencyData.name || agencyData.short_name;
        const dbAgency = await prisma.agency.findUnique({ where: { name: agencyName }});
        if (dbAgency && agencyData.cfr_references) {
            for (const ref of agencyData.cfr_references) {
                if (ref.title && typeof ref.title === 'number') {
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

    // 5. FETCH VERSION DATES (Metadata Only)
    for (const t of titlesList) {
        try {
            const versionsRes = await fetch(`${ECFR_API_BASE}/versioner/v1/versions/title-${t.number}.json`);
            if (versionsRes.ok) {
                const versionsData = await versionsRes.json();
                if (versionsData.content_versions) {
                    const rawDates = versionsData.content_versions.map((v: any) => v.issue_date);
                    const uniqueDates = Array.from(new Set(rawDates)) as string[];
                    const sortedDates = uniqueDates.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());
                    
                    await prisma.regulationTitle.update({
                        where: { titleNumber: t.number },
                        data: { snapshotDates: JSON.stringify(sortedDates) }
                    });
                }
            }
            await new Promise(r => setTimeout(r, 50)); 
        } catch (err) {
            console.warn(`Skipped dates for Title ${t.number}`);
        }
    }

    return NextResponse.json({ success: true, message: shouldReset ? "Database Reset & Metadata Initialized" : "Metadata Refreshed (Data Preserved)" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}