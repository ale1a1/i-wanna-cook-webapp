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
