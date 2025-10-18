-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "accessUntil" DATETIME,
    "premiumUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("accessUntil", "avatarUrl", "bio", "coverUrl", "createdAt", "discordTag", "displayName", "email", "fullNameIC", "handle", "id", "inGameId", "inGameName", "passwordHash", "phoneIC", "premiumUntil", "role", "status", "updatedAt") SELECT "accessUntil", "avatarUrl", "bio", "coverUrl", "createdAt", "discordTag", "displayName", "email", "fullNameIC", "handle", "id", "inGameId", "inGameName", "passwordHash", "phoneIC", "premiumUntil", "role", "status", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
