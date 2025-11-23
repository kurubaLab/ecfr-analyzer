-- CreateTable
CREATE TABLE "Agency" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT
);

-- CreateTable
CREATE TABLE "RegulationTitle" (
    "titleNumber" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titleName" TEXT NOT NULL,
    "scrapeStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "lastScraped" DATETIME,
    "snapshotDates" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "AgencyTitle" (
    "agencyId" INTEGER NOT NULL,
    "titleNumber" INTEGER NOT NULL,

    PRIMARY KEY ("agencyId", "titleNumber"),
    CONSTRAINT "AgencyTitle_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgencyTitle_titleNumber_fkey" FOREIGN KEY ("titleNumber") REFERENCES "RegulationTitle" ("titleNumber") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegulationSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titleNumber" INTEGER NOT NULL,
    "effectiveDate" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "restrictionCount" INTEGER NOT NULL,
    "restrictionDensityScore" REAL NOT NULL,
    CONSTRAINT "RegulationSnapshot_titleNumber_fkey" FOREIGN KEY ("titleNumber") REFERENCES "RegulationTitle" ("titleNumber") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Agency_name_key" ON "Agency"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RegulationSnapshot_titleNumber_effectiveDate_key" ON "RegulationSnapshot"("titleNumber", "effectiveDate");
