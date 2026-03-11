-- CreateTable
CREATE TABLE "ChapterCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "chapterCodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChapterCode_code_key" ON "ChapterCode"("code");

-- CreateIndex
CREATE INDEX "ChapterCode_chapterId_idx" ON "ChapterCode"("chapterId");

-- CreateIndex
CREATE INDEX "ChapterCode_code_idx" ON "ChapterCode"("code");

-- CreateIndex
CREATE INDEX "ChapterCode_createdBy_idx" ON "ChapterCode"("createdBy");

-- CreateIndex
CREATE INDEX "ChapterCode_isUsed_idx" ON "ChapterCode"("isUsed");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterAccess_userId_chapterId_key" ON "ChapterAccess"("userId", "chapterId");

-- CreateIndex
CREATE INDEX "ChapterAccess_userId_idx" ON "ChapterAccess"("userId");

-- CreateIndex
CREATE INDEX "ChapterAccess_chapterId_idx" ON "ChapterAccess"("chapterId");

-- AddForeignKey
ALTER TABLE "ChapterCode" ADD CONSTRAINT "ChapterCode_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterCode" ADD CONSTRAINT "ChapterCode_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterCode" ADD CONSTRAINT "ChapterCode_usedBy_fkey" FOREIGN KEY ("usedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterAccess" ADD CONSTRAINT "ChapterAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterAccess" ADD CONSTRAINT "ChapterAccess_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterAccess" ADD CONSTRAINT "ChapterAccess_chapterCodeId_fkey" FOREIGN KEY ("chapterCodeId") REFERENCES "ChapterCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
