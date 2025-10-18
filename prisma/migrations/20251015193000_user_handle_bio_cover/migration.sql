-- Add handle/bio/coverUrl columns to User and create unique index on handle
PRAGMA foreign_keys=OFF;

-- Create a new table with the desired schema (SQLite doesn't support many ALTERs)
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "handle" TEXT,
    "bio" TEXT,
    "coverUrl" TEXT,
    "fullNameIC" TEXT,
    "inGameId" INTEGER,
    "phoneIC" TEXT,
    "avatarUrl" TEXT,
    "discordTag" TEXT,
    "inGameName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "accessUntil" DATETIME,
    "premiumUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Copy data
INSERT INTO "new_User" ("id","email","passwordHash","displayName","handle","bio","coverUrl","fullNameIC","inGameId","phoneIC","avatarUrl","discordTag","inGameName","role","status","accessUntil","premiumUntil","createdAt","updatedAt")
SELECT "id","email","passwordHash","displayName",NULL as "handle",NULL as "bio",NULL as "coverUrl","fullNameIC","inGameId","phoneIC","avatarUrl","discordTag","inGameName","role","status","accessUntil","premiumUntil","createdAt","updatedAt" FROM "User";

-- Drop old table and rename new one
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

-- Recreate indexes and uniques
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

PRAGMA foreign_keys=ON;
