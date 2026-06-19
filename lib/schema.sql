CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cognito_sub TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tried_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  recipe_title TEXT NOT NULL,
  tried_on DATE NOT NULL DEFAULT CURRENT_DATE,
  estimated_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  recipe_title TEXT NOT NULL,
  ingredient_name TEXT NOT NULL,
  ingredient_amount TEXT,
  checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  satisfaction INTEGER CHECK (satisfaction BETWEEN 1 AND 5),
  time_accuracy INTEGER CHECK (time_accuracy BETWEEN 1 AND 5),
  difficulty TEXT CHECK (difficulty IN ('Very Easy', 'Easy', 'Moderate', 'Difficult', 'Very Difficult')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS quick_shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  recipe_title TEXT NOT NULL,
  ingredient_name TEXT NOT NULL,
  ingredient_amount TEXT,
  checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS active_recipe_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  recipe_id TEXT NOT NULL,
  recipe_title TEXT NOT NULL,
  recipe_data JSONB NOT NULL,
  substitutions JSONB NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'scan',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Migration: add source column if not exists
ALTER TABLE active_recipe_session ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'scan';

-- Migration: disclaimer acceptance (superseded by user_legal_acceptances — kept for backwards compat)
ALTER TABLE users ADD COLUMN IF NOT EXISTS disclaimer_accepted_at TIMESTAMP;

-- Migration: marketing email consent (GDPR — required before sending re-engagement/referral emails)
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMP;

-- Legal document version control
-- Stores every version of every legal document. Never update a row — insert a new version.
CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('disclaimer', 'privacy_policy', 'terms_of_service')),
  version TEXT NOT NULL,                -- e.g. 'v1', 'v2'
  effective_date DATE NOT NULL,
  content TEXT NOT NULL,               -- full document text at time of this version
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (document_type, version)
);

-- Records every legal document a user has accepted, with full audit trail
CREATE TABLE IF NOT EXISTS user_legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id),
  accepted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address TEXT,                     -- captured at registration for audit purposes
  UNIQUE (user_id, legal_document_id)
);

-- Migration: trial warning email tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_warning_sent_at TIMESTAMP;

-- Migration: weekly search usage tracking
CREATE TABLE IF NOT EXISTS search_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, week_start)
);

-- Migration: weekly scan usage tracking
CREATE TABLE IF NOT EXISTS scan_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, week_start)
);

-- Migration: meal plan naming, folders, filters, and drift tracking
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS folder TEXT;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS filters_json JSONB;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS is_modified BOOLEAN NOT NULL DEFAULT FALSE;

-- Migration: allow multiple plans per user (drop week_start uniqueness, widen to timestamp)
ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS meal_plans_user_id_week_start_key;
ALTER TABLE meal_plans ALTER COLUMN week_start TYPE TIMESTAMP USING week_start::TIMESTAMP;

-- Migration: store original plan snapshot so change-tracking works after reload
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS original_plan_data JSONB;

-- Migration: tags on saved recipes
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Migration: folders and search filters on saved/tried recipes
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS folder TEXT;
ALTER TABLE favourites ADD COLUMN IF NOT EXISTS search_filters JSONB;
ALTER TABLE tried_recipes ADD COLUMN IF NOT EXISTS folder TEXT;
ALTER TABLE tried_recipes ADD COLUMN IF NOT EXISTS search_filters JSONB;
