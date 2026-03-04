-- CreateTable
CREATE TABLE "telegram_link" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "chatType" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_link_code" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_link_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_update_log" (
    "id" TEXT NOT NULL,
    "updateId" BIGINT NOT NULL,
    "chatId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_update_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_userId_key" ON "telegram_link"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_chatId_key" ON "telegram_link"("chatId");

-- CreateIndex
CREATE INDEX "telegram_link_userId_isActive_idx" ON "telegram_link"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_code_code_key" ON "telegram_link_code"("code");

-- CreateIndex
CREATE INDEX "telegram_link_code_userId_expiresAt_idx" ON "telegram_link_code"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_update_log_updateId_key" ON "telegram_update_log"("updateId");

-- CreateIndex
CREATE INDEX "telegram_update_log_chatId_idx" ON "telegram_update_log"("chatId");

-- AddForeignKey
ALTER TABLE "telegram_link" ADD CONSTRAINT "telegram_link_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_link_code" ADD CONSTRAINT "telegram_link_code_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
