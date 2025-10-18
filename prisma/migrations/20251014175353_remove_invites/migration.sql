/*
  Warnings:

  - You are about to drop the `InviteCode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserInvite` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "fullNameIC" TEXT;
ALTER TABLE "User" ADD COLUMN "iban" TEXT;
ALTER TABLE "User" ADD COLUMN "phoneIC" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "InviteCode";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserInvite";
PRAGMA foreign_keys=on;
