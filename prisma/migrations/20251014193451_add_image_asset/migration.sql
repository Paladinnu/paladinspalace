-- CreateTable
CREATE TABLE "ImageAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hash" TEXT NOT NULL,
    "original" TEXT NOT NULL,
    "thumb" TEXT,
    "mime" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "blurDataURL" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageAsset_hash_key" ON "ImageAsset"("hash");
