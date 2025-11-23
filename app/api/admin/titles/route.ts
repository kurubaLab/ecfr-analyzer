// app/api/admin/titles/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    const titles = await prisma.regulationTitle.findMany({
        orderBy: { titleNumber: 'asc' },
        include: {
            snapshots: { select: { effectiveDate: true } } // Get list of LOADED dates
        }
    });

    const data = titles.map(t => ({
        number: t.titleNumber,
        name: t.titleName,
        allDates: JSON.parse(t.snapshotDates || "[]"),
        loadedDates: t.snapshots.map(s => s.effectiveDate)
    }));

    return NextResponse.json(data);
}