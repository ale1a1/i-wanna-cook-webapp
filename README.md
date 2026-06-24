# I Wanna Cook

A full-stack recipe discovery app that helps you find meals based on what's in your fridge, dietary preferences, and cooking time. Built with Next.js 15, AWS Cognito, and PostgreSQL on AWS RDS.

## Features

- **Recipe Search** — filter by diet, cuisine, prep time, health score, and ingredients you have
- **Recipe Detail Pages** — ingredients, step-by-step instructions, and nutritional info (SSG with ISR)
- **Shopping List** — add ingredients from any recipe, check them off as you shop
- **Tried Recipes** — log every recipe you've cooked with a date stamp
- **User Accounts** — register, verify email, log in, change name and password, delete account
- **Dark / Light / System theme** — saved per user in the database
- **Forgot Password** — full reset flow via AWS Cognito email

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| State | Redux Toolkit |
| Auth | AWS Cognito (email + password, verification, password reset) |
| Database | PostgreSQL on AWS RDS |
| Recipes API | Spoonacular |
| Deployment | AWS Amplify |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- AWS account with a Cognito User Pool configured
- PostgreSQL database (local or AWS RDS)
- Spoonacular API key (free tier at [spoonacular.com/food-api](https://spoonacular.com/food-api))

### Setup

1. **Clone the repo**

```bash
git clone https://github.com/ale1a1/i-wanna-cook-app.git
cd i-wanna-cook-app
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Configure environment variables**

Create a `.env.local` file in the root:

```env
SPOONACULAR_API_KEY=your_spoonacular_key

DATABASE_URL=postgresql://user:password@host:5432/dbname

COGNITO_CLIENT_ID=your_cognito_app_client_id
COGNITO_USER_POOL_ID=your_cognito_user_pool_id
COGNITO_REGION=eu-west-2
```

4. **Set up the database**

Run the schema against your PostgreSQL database:

```bash
psql $DATABASE_URL -f lib/schema.sql
```

5. **Configure Cognito**

In your AWS Cognito User Pool → App client:
- Enable **ALLOW_USER_PASSWORD_AUTH** authentication flow
- Enable email verification (automatic)
- No client secret required

6. **Run locally**

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
├── api/                    # API routes (server-side only)
│   ├── auth/               # login, register, verify, forgot-password, reset-password
│   ├── recipes/            # Spoonacular proxy (search, detail)
│   ├── shopping-list/      # CRUD for shopping list
│   └── user/               # PATCH (update profile/theme/password), DELETE (account)
├── recipe/[id]/            # SSG recipe detail (Server Component + Client Component)
├── login/                  # Login + Register tabs
├── verify/                 # Email verification code entry
├── forgot-password/        # Forgot password + reset flow
├── profile/                # Account settings, theme, delete account
├── search/                 # Recipe search with filters
├── shopping-list/          # Shopping list management
└── tried-recipes/          # Cooked recipes log

lib/
├── db.ts                   # PostgreSQL connection pool
├── cognito.ts              # Cognito client singleton
└── schema.sql              # Database schema

redux/
└── features/
    ├── auth/               # User session state
    ├── recipes/            # Recipes, tried recipes, search history
    └── filters/            # Search filter state
```

## Deployment

The app is deployed on **AWS Amplify** with automatic builds on push to `main`. The `amplify.yml` file configures the build pipeline.

Environment variables must be set in the Amplify Console under **App settings → Environment variables**.

## License

MIT
