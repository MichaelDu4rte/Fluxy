-- CreateEnum
CREATE TYPE "MarketProvider" AS ENUM ('COINGECKO');

-- AlterTable
ALTER TABLE "financial_account"
ADD COLUMN     "investmentProvider" "MarketProvider",
ADD COLUMN     "investmentAssetId" TEXT,
ADD COLUMN     "investmentAssetSymbol" TEXT,
ADD COLUMN     "investmentAssetName" TEXT,
ADD COLUMN     "investmentEntryPriceBrl" DOUBLE PRECISION;

