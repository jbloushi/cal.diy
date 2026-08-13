-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN "phoneNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "public"."users"("phoneNumber");

-- CreateEnum
CREATE TYPE "public"."WhatsAppConnectionStatus" AS ENUM ('CONNECTING', 'QR_REQUIRED', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."OtpPurpose" AS ENUM ('LOGIN', 'BOOKING_VERIFICATION');

-- CreateEnum
CREATE TYPE "public"."SlugOwnerType" AS ENUM ('USER', 'TEAM');

-- CreateTable
CREATE TABLE "public"."WhatsAppConnection" (
    "id" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "status" "public"."WhatsAppConnectionStatus" NOT NULL DEFAULT 'CONNECTING',
    "connectedNumber" TEXT,
    "lastConnectedAt" TIMESTAMP(3),
    "userId" INTEGER,
    "teamId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OtpVerification" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "purpose" "public"."OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "whatsAppConnectionId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SlugRegistry" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerType" "public"."SlugOwnerType" NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlugRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConnection_instanceName_key" ON "public"."WhatsAppConnection"("instanceName");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConnection_userId_key" ON "public"."WhatsAppConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConnection_teamId_key" ON "public"."WhatsAppConnection"("teamId");

-- CreateIndex
CREATE INDEX "OtpVerification_phoneNumber_purpose_expiresAt_idx" ON "public"."OtpVerification"("phoneNumber", "purpose", "expiresAt");

-- CreateIndex
CREATE INDEX "OtpVerification_whatsAppConnectionId_expiresAt_idx" ON "public"."OtpVerification"("whatsAppConnectionId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SlugRegistry_slug_key" ON "public"."SlugRegistry"("slug");

-- CreateIndex
CREATE INDEX "SlugRegistry_ownerType_ownerId_idx" ON "public"."SlugRegistry"("ownerType", "ownerId");

-- AddForeignKey
ALTER TABLE "public"."WhatsAppConnection" ADD CONSTRAINT "WhatsAppConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WhatsAppConnection" ADD CONSTRAINT "WhatsAppConnection_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OtpVerification" ADD CONSTRAINT "OtpVerification_whatsAppConnectionId_fkey" FOREIGN KEY ("whatsAppConnectionId") REFERENCES "public"."WhatsAppConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

