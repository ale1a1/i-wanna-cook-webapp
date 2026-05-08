-- Run this once against the live RDS database
-- Drops old auth columns, adds Cognito sub + theme

ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cognito_sub TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'system';

-- Make cognito_sub NOT NULL after backfill (if any existing rows)
-- If table is empty this is safe to run immediately:
-- ALTER TABLE users ALTER COLUMN cognito_sub SET NOT NULL;

-- Delete all existing users (confirmed: no existing users to keep)
TRUNCATE users CASCADE;

-- Now enforce NOT NULL
ALTER TABLE users ALTER COLUMN cognito_sub SET NOT NULL;
