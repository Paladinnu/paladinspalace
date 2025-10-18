-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER,
    "category" TEXT,
    "imagesJson" TEXT NOT NULL DEFAULT '[]',
    "attributesJson" TEXT NOT NULL DEFAULT '{}',
    "searchIndex" TEXT NOT NULL DEFAULT '',
    "sellerId" TEXT NOT NULL,
    "isGold" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Listing" ("category", "createdAt", "description", "id", "imagesJson", "isGold", "price", "searchIndex", "sellerId", "title", "updatedAt") SELECT "category", "createdAt", "description", "id", "imagesJson", "isGold", "price", "searchIndex", "sellerId", "title", "updatedAt" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE INDEX "Listing_createdAt_id_idx" ON "Listing"("createdAt", "id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
