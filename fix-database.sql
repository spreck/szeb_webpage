-- Add OAuth columns if they don't exist
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(256);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Make columns nullable for OAuth users
ALTER TABLE "user" ALTER COLUMN username DROP NOT NULL;
ALTER TABLE "user" ALTER COLUMN password DROP NOT NULL;
ALTER TABLE "user" ALTER COLUMN fs_uniquifier DROP NOT NULL;
