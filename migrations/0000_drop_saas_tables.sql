DROP INDEX IF EXISTS "subscriptions_user_id_idx";
DROP INDEX IF EXISTS "usage_user_month_idx";

ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_user_id_users_id_fk";
ALTER TABLE "usage" DROP CONSTRAINT IF EXISTS "usage_user_id_users_id_fk";

DROP TABLE IF EXISTS "subscriptions";
DROP TABLE IF EXISTS "usage";
