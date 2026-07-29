-- CreateTable
CREATE TABLE "WatchedMovie" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "imdbId" TEXT NOT NULL,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchedMovie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchedMovie_userId_idx" ON "WatchedMovie"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedMovie_userId_imdbId_key" ON "WatchedMovie"("userId", "imdbId");

-- AddForeignKey
ALTER TABLE "WatchedMovie" ADD CONSTRAINT "WatchedMovie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
