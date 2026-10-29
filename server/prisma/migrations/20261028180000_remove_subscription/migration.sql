-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_parentId_fkey";

-- DropTable
DROP TABLE "Subscription";

-- DropEnum
DROP TYPE "SubscriptionPlan";

-- DropEnum
DROP TYPE "SubscriptionStatus";

