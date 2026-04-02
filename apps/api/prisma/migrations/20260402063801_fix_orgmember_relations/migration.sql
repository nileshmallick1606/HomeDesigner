/*
  Warnings:

  - You are about to drop the column `org` on the `org_members` table. All the data in the column will be lost.
  - You are about to drop the column `user` on the `org_members` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "org_members" DROP COLUMN "org",
DROP COLUMN "user";
