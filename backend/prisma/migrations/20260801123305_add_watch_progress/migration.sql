-- AlterTable
ALTER TABLE "WatchedMovie" ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "progressSeconds" INTEGER NOT NULL DEFAULT 0;
