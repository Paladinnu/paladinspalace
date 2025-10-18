-- CreateTable
CREATE TABLE "ListingSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ListingSnapshot_sellerId_createdAt_idx" ON "ListingSnapshot"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingSnapshot_listingId_createdAt_idx" ON "ListingSnapshot"("listingId", "createdAt");
