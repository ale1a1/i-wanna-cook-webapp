================================================================
WHAT SHOULD I COOK — ROADMAP
================================================================

All items refer to the mobile app (React Native / Expo) unless explicitly stated otherwise.
Backend API routes (/api/*) and the Next.js server are shared infrastructure — they are
not considered "web app features" and changes to them apply to both platforms.


================================================================
LIST: MUST — Before Launch
================================================================

--- Subscription & Payments ---

Wire up Google Play Billing
Android real subscription flow. Users can actually subscribe and pay via Google Play Billing.

Apple IAP (if doing iOS)
Apple In-App Purchase integration. Requires Apple Developer account ($99/year).

Auto-downgrade to free tier when trial expires
When trial ends, account drops to free tier automatically. No features deleted — locked behind upgrade prompt.
trial_active is computed at login time from trial_started_at — enforcement is already there, but the UI needs
to reflect it gracefully after expiry without requiring a re-login.

Trial expiry modal — 1-2 days warning
When trial is 1-2 days from expiring, show a one-time modal on app open prompting user to upgrade.
Fire once per account, not every session.

--- Legal & Safety ---

Professional disclaimer including allergy warning
A proper legal disclaimer must be shown during registration AND accessible from the app at all times.
Must cover: nutritional information is approximate and not a substitute for professional dietary advice,
allergy information may not be complete or accurate — always check product labels, not suitable for
medical dietary management. Requires a lawyer to draft or review.
NOTE: A user can currently register without seeing any allergy disclaimer — this is a legal risk before launch.

Privacy policy page
Required by both App Store and Google Play.

Terms of service page
Required by both App Store and Google Play.

--- App Store Submission ---

Custom app icon
Replace Expo default icon with branded app icon.

Custom splash screen
Branded splash screen for app launch.

App store screenshots
Minimum 5 to 8 screenshots showing key features.

App store description and keyword optimisation
Written description with keywords for discoverability.

Age rating questionnaire
Complete for both Google Play and App Store submission.

Google Play developer account
One-time $25 fee.

--- Navigation & UX ---

Navigation audit — back gestures and close buttons
Some screens use X button (blocks swipe-back gesture), others rely on swipe-left. Needs a full audit
before launch. Swipe-back should work on all stack screens; modals should have X. Recipe detail,
cooking mode, login modal, profile modals all need checking.

--- Emails ---

Fortnightly re-engagement email
Sent every 2 weeks to inactive users to bring them back. Requires SQS/Lambda or a cron job — not yet built.

--- Search ---

Ingredient autocomplete — search & meal planner
When typing in the Ingredients field (search) or the Exclude Ingredients field (meal planner), query
Spoonacular's autocomplete ingredient endpoint in real time and show suggestions below the input.
Reduces typos and ensures ingredient names match Spoonacular's DB exactly. Shared reusable component.
Spoonacular endpoint: GET /food/ingredients/autocomplete?query=&number=5.

--- Meal & Nutrition ---

Macro and nutrition tracking
Daily targets for calories, protein, carbs, fat. Track meals logged against targets.
Show trends over time. Premium.

Recipe collections
Organise favourites into custom named folders — "Weeknight dinners", "Date night", "Batch cooking Sunday".
First collection free, more = premium.


--- Review & Enhance ---

Endpoint enhancement audit
Cross-reference the full Spoonacular endpoint list against SHOULD / COULD / Phase 3 features.
Identify which planned features could be built with existing endpoints already in use, and which
ones unlock cheap wins with minimal extra API calls. Check for any Spoonacular endpoints not yet
used that could improve existing features (autocomplete, nutrition facts, food trivia, recipe card
images, etc). Do this before starting any new feature work.


================================================================
LIST: SHOULD — High Priority After Launch
================================================================

Guided Navigation (contextual help system)
For non-obvious actions (quick shopping list cart button, substitution flow, session tabs, etc.), show a
one-time confirmation prompt with a "Don't ask again" option. User can also tap a ? icon on any screen
to trigger an animated walkthrough. Guided navigation toggleable in Settings. On by default for new users.

Dietary profile
Let users set their dietary restrictions and intolerances once in their profile — auto-applied to all
searches and meal plans. Premium feature. Foundation for sport/fitness presets.

AI chat assistant
A conversational screen where users describe what they have or want and get recipe suggestions from Claude.
"Something quick with chicken", "high protein after gym", "use my leftovers". Premium feature.

Smart recommendations
Suggest recipes based on the user's tried recipes and favourites history. Low API cost, high perceived value.

Pantry tracking
Manual ingredient inventory. Highlight items approaching expiry. Auto-suggest recipes that use what is
about to expire. Big differentiator.

Full nutrition breakdown panel
Basic panel (calories, protein, fat + sat fat, carbs, per serving) live. Full premium panel
(fibre, sugar, RDA percentages) still to build as premium feature.

Chef avatar narrator for cooking mode
A distinctive chef character shown during cooking mode. Gives the app personality. The avatar reacts
as steps progress — idle, talking, celebrating when done.

Voice narrator for cooking mode
Chef reads each step aloud using a natural-sounding voice. Users choose from a small set of voice styles.
Powered by a TTS API (e.g. ElevenLabs or Google TTS). Replaces current basic expo-speech. Premium.

Sentry error monitoring
Replace current manual error reporting with Sentry. Captures crashes, JS errors, API failures with full
stack traces. Currently errors are reported via a custom Resend email which is fragile.

AI recipe instruction enrichment
For recipes with 50–70% of ingredients mentioned in steps, pass to Claude Haiku to enrich instructions.
Cost tracking required — log each enrichment call (recipe_id, timestamp, tokens_used) before enabling broadly.

Analytics
Track searches, saves, completions, premium conversion, trial retention, meal plan usage, shopping list engagement.

Redis caching
Reduce Spoonacular API calls. Lower costs at scale.

CloudFront CDN
Faster image delivery globally.


================================================================
LIST: COULD — Later
================================================================

AI recipe modification
Make it healthier, increase protein, make it vegetarian, reduce calories. One tap. Claude API. Premium only.

Push notifications
Dinner reminders, meal plan nudges, trial expiry alerts. Drives retention.

Cooking mode upgrades — individual item timers
Set a timer for pasta, another for sauce, independently. Real cooking utility.

Voice cooking assistant Phase 2
Always-on microphone across the whole app. Navigate by voice, search by voice, apply filters by voice.
Persistent subtle listening indicator.

Language preference
User selects language, persisted to profile.

MFA
Multi-factor authentication via AWS Cognito. Low priority but good for trust.

Barcode scanner
Scan groceries to add to pantry instantly.


================================================================
LIST: FUTURE — Phase 3
================================================================

Supermarket shopping list integration
Send the in-app shopping list directly to an online supermarket for delivery or click-and-collect.
Target UK supermarkets: Tesco, Morrisons, Aldi, Lidl, Sainsbury's. No public cart APIs exist today —
requires partnership or aggregator (e.g. Instacart if they expand UK). Phase 3 / partnership territory.

Fridge photo to full pantry state
Already partially built — ingredient scan exists. Full "what can I cook with this?" flow using full
pantry state. Needs Spoonacular Cook plan ($29/mo) at scale.

Recipe collections management
Recipe boards, folders, custom collections.


================================================================
LIST: TECHNICAL DEBT
================================================================

AWS SQS + Lambda email workers
Queue workers for re-engagement emails. Welcome/warning/deletion emails currently fire inline.
Re-engagement email has no trigger yet — needs a scheduled job.

Push notification infrastructure
Required before push notifications can be built.


================================================================
SERVICE FAILURE & BILLING ALERTS — MANUAL CHECKLIST
================================================================

This section documents every paid/quota service, what breaks when it fails,
whether the app currently alerts you, and what you need to check/pay.

----------------------------------------------------------------
1. ANTHROPIC (Claude API)
----------------------------------------------------------------
Cost model: pay-per-token. No hard cap — if you run out of credits the API returns 401 or 429.
Used for: ingredient photo scanning, substitute suggestions, AI filter suggestions, meal replacement validation.
Routes: /api/recipes/analyze-image, /api/recipes/suggest-substitute, /api/recipes/suggest-filters, /api/meal-plan/replace-meal

What breaks when it fails:
- Fridge scanner stops working (users get generic error)
- AI goal interpretation silently falls back to default params
- Substitute suggestions fail during cooking flow
- Meal replacement validation skipped (candidates shown unvalidated)

Alert to owner: ✅ IMPLEMENTED — lib/alertOwner.ts sends you a 🚨 email on 401/429/529
  - 401 = API key invalid or missing → check ANTHROPIC_API_KEY in Amplify env vars
  - 429 = rate limit hit → check Anthropic console, top up credits
  - 529/503 = Anthropic overloaded → temporary, users retry

Action when alerted:
→ Go to console.anthropic.com → check usage and credits → top up if needed

Gap / TODO: No alerting if the key is misconfigured on Amplify (would show as 401 on every request).

----------------------------------------------------------------
2. SPOONACULAR
----------------------------------------------------------------
Cost model: points-based daily quota. Free = 150pts/day. Paid plans from $29/mo.
complexSearch = ~1pt + 0.01pt per result. Recipe detail = ~1pt.
Used for: all recipe search, recipe detail, wine pairing, meal plan generation, ingredient autocomplete.
Routes: /api/recipes/search, /api/recipes/[id], /api/recipes/wine-pairing, /api/meal-plan/generate, /api/meal-plan/replace-*

What breaks when it fails (402 response):
- Recipe search returns no results / error
- Meal plan generation fails completely
- Recipe detail pages fail to load
- Wine pairing fails

Alert to owner: ⚠️ PARTIAL
  - Meal plan routes (generate, replace-day, replace-meal): 402 caught, returns friendly error to user
  - Recipe search route (/api/recipes/search): 402 passed through as raw error — NO owner alert
  - Recipe detail, wine pairing: NO 402 handling, NO owner alert
  - NO email to you when quota is exhausted on any route

Action when alerted (currently manual — check dashboard):
→ Go to spoonacular.com/food-api/console → check daily points used
→ Upgrade plan or wait until midnight UTC for quota reset

TODO: Add checkSpoonacularError() equivalent to search, recipe detail, and wine-pairing routes.

----------------------------------------------------------------
3. RESEND (email service)
----------------------------------------------------------------
Cost model: free tier = 3,000 emails/month, 100/day. Paid from $20/mo.
Used for: welcome email, trial warning email, account deletion email, error report emails to owner.
Routes: /api/auth/register, /api/auth/login, /api/user, /api/report-error, lib/alertOwner.ts

What breaks when it fails:
- Users don't receive welcome email (non-critical, no UX block)
- Trial warning email not sent (non-critical)
- Deletion confirmation email not sent (non-critical)
- Owner error alert emails stop arriving (CRITICAL — you go blind)
- report-error emails stop arriving (you stop seeing user errors)

Alert to owner: ❌ NOT IMPLEMENTED
  - If Resend quota is exceeded or key expires, all emails silently fail
  - No fallback, no alert (you can't alert via Resend if Resend is down)
  - Resend errors are currently swallowed with .catch(() => {})

Action when it fails:
→ Go to resend.com/overview → check email logs and quota
→ Upgrade plan if over limit
→ If key expired: regenerate in Resend dashboard, update RESEND_API_KEY in Amplify env vars

TODO: Add console.error logging when Resend fails so at least Amplify CloudWatch shows it.
      Consider a secondary alert channel (e.g. a webhook to a free Slack/Discord) as fallback.

----------------------------------------------------------------
4. AWS RDS PostgreSQL
----------------------------------------------------------------
Cost model: always-on instance. eu-west-2. Charged per hour regardless of usage.
If you stop paying AWS, the instance stops and ALL user data is inaccessible.

What breaks when it fails:
- Login fails (can't fetch user profile)
- Registration fails (can't store user)
- All favourites, shopping list, meal plans, tried recipes return errors
- Entire app is essentially broken for logged-in users

Alert to owner: ❌ NOT IMPLEMENTED
  - DB errors return 500 to the user and fire a report-error email (if Resend is up)
  - No specific "DB is down" alert to you
  - No health check endpoint

Action when it fails:
→ Go to AWS Console → RDS → check instance status
→ If stopped: start the instance (takes ~2 min)
→ If billing issue: pay AWS bill → instance auto-restarts
→ If security group issue: check inbound rules allow Amplify's egress IPs

TODO: Add a /api/health route that pings the DB and returns 200/500.
      Set up AWS CloudWatch alarm on RDS — sends email when CPU/connections spike or instance stops.

----------------------------------------------------------------
5. AWS COGNITO
----------------------------------------------------------------
Cost model: free up to 50,000 MAUs. Paid beyond that ($0.0055/MAU).
Used for: all user auth — register, login, email verify, forgot password, change password.

What breaks when it fails:
- Users cannot log in or register
- Password reset fails
- Email verification fails

Alert to owner: ❌ NOT IMPLEMENTED
  - Cognito errors return generic 500/401 to users
  - No owner alert when Cognito is down or misconfigured

Action when it fails:
→ Go to AWS Console → Cognito → check User Pool status
→ Check Amplify env vars: COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID match the pool
→ If billing: Cognito free tier is generous, unlikely to be a cost issue at current scale

----------------------------------------------------------------
6. AWS AMPLIFY (hosting & deployment)
----------------------------------------------------------------
Cost model: pay-per-build + per-GB served. Low cost at current scale.
Used for: hosting Next.js backend + auto-deploy on push to main.

What breaks when it fails:
- New deployments fail (code changes don't go live)
- If instance is stopped: entire backend is down, app is dead

Alert to owner: ❌ NOT IMPLEMENTED
  - Build failures visible in Amplify console but no email alert
  - No uptime monitoring

Action when it fails:
→ Go to AWS Console → Amplify → check build logs
→ Check environment variables are all set (missing var = build passes but runtime fails)
→ If billing: pay AWS bill

TODO: Enable Amplify build notifications (Settings → Notifications → add your email).
      This is a one-click setup in the Amplify console — do this now.

----------------------------------------------------------------
SUMMARY — ALERT COVERAGE STATUS
----------------------------------------------------------------

Service          | Quota/Billing Alert | App Error to User | Owner Email Alert
-----------------|--------------------|--------------------|------------------
Anthropic Claude | ✅ Implemented      | ✅ Generic error   | ✅ 401/429/529
Spoonacular      | ⚠️ Partial (meal plan only) | ✅ Partial | ❌ No owner email
Resend           | ❌ Not implemented  | N/A (email service)| ❌ Silently fails
AWS RDS          | ❌ Not implemented  | ✅ 500 error       | ⚠️ Via report-error only
AWS Cognito      | ❌ Not implemented  | ✅ Auth error      | ❌ No owner email
AWS Amplify      | ❌ Not implemented  | N/A (hosting)      | ❌ No build alerts

IMMEDIATE ACTIONS (do these manually now):
1. Amplify build notifications — enable in Amplify console (1 minute, free)
2. AWS CloudWatch RDS alarm — alert when DB stops (15 minutes, free tier)
3. Add Spoonacular 402 handling to /api/recipes/search (code change needed)
4. Add console.error to all Resend .catch() blocks so CloudWatch at least logs failures


================================================================
LIST: APIs & BREAKING POINTS
================================================================

Spoonacular
Used for: recipe search, recipe detail, wine pairing, meal plan generation.
API key: SPOONACULAR_API_KEY in .env.local (server-side only, never client).
Quota: points-based. complexSearch = 1pt + 0.01pt per result.
Breaking points:
- 402 → quota exhausted. Check spoonacular.com dashboard. Resets midnight UTC.
- Search returns 0 results → too many filters combined, or ingredient names too specific.
- mealplanner/generate overshoots calories → backend scales nutrients back to target.

Claude (Anthropic)
Used for: ingredient photo scanning, substitute suggestions, AI filter suggestions, meal replacement validation.
API key: ANTHROPIC_API_KEY in .env.local + Amplify env vars.
Model: claude-haiku-4-5-20251001. Always use full model ID.
Breaking points:
- 401 → API key missing or wrong → owner alerted via email ✅
- 429 → rate limit hit → owner alerted via email ✅
- 529/503 → Anthropic overloaded → owner alerted via email ✅

AWS Cognito — Region: eu-west-2. Used for all auth.
AWS RDS PostgreSQL — Region: eu-west-2. All persistent data.
AWS Amplify — Auto-deploy on push to main.
Resend — Transactional emails. Free tier: 3000/month, 100/day.

Expo / React Native (mobile)
Breaking points:
- Metro bundler crash → delete node_modules/.cache and restart.
- Public Wi-Fi blocks LAN → use npx expo start --tunnel.
- Android build fails → check C:\p\ short path workaround (Windows 260-char path limit).
- Navigation crash on tab swap → check HomeTabs in App.tsx.


================================================================
PRICING
================================================================

Free — $0
10 searches/week, 3 scans/week, flat favourites list, basic features. 14-day trial on signup.

Premium — $2.49/month or $19.99/year
Full access. Unlimited scans and searches. All premium features.

Future pricing — $4.99/month
Once AI assistant and personalisation are live.

14-day free trial on every new account. No card required.


================================================================
LIST: ALREADY BUILT ✅
================================================================

Recipe search with filters
Prep time, budget, diet, cuisine, taste, healthiness, calories, protein, ingredients.

Match all / Match some toggle
When searching with multiple ingredients, toggle between matching all or some. Inline toggle above results.

Recipe detail pages
Nutrition panel (calories, protein, fat with saturated fat breakdown, carbs — per serving), ingredients list,
step-by-step instructions. Substitutions banner when active.

My Recipes — unified Saved + Tried screen
Single screen replaces separate Favourites and Tried tabs. Filter tabs: All / Saved (N) / Tried (N).
Each recipe card shows Saved badge and/or Tried badge. Heart to unsave, star to rate, trash to remove from
tried history. Tried recipes show rating summary inline. Images loaded from Spoonacular CDN for tried-only recipes.

Shopping list
Check off items per recipe. Delete individual items or clear all.

User accounts (mobile)
Register, login, email verify (inline code screen), forgot password (inline 2-step), change password,
delete account. All flows handled inside the app — no browser redirect.

Light / dark theme

Weekly AI meal planner — full v2 ✅
Two-path generation: AI Goal (preset chips + free text + voice → Claude interprets → generates) and
Customise (4-step wizard: Nutrition → Diet & Cuisine → Macronutrients → Micronutrients).
Both paths end with a shared Meals per Day picker (3/4/5/6). Calorie options up to 5000 kcal.
AI path auto-suggests meals/day based on goal (Mass Gaining → 5, Weight Loss → 3).
Backend: one main Spoonacular call at exact daily target for 3 meals; extra meals (4-6) fetched
separately via complexSearch as snack-sized slots carved from within the daily budget.
Displayed calories always scaled to exactly match the user's target.
Save plan: name + folder (Bulking / Weight Loss / etc). Save button always visible in top bar.
New plan button warns before discarding current plan (Save / Discard / Cancel).
Replace meal: calculates remaining daily nutrient budget, searches Spoonacular within that window,
Claude validates fit within ±10% tolerance across all constraints. Override allowed with warning.
Replace full day: re-generates using original filters, falls back to duplicating closest day.
Filter drift warning: amber badge when swaps deviate from original criteria. Taps to show summary.
DB: meal_plans table extended with name, folder, filters_json, is_modified columns.
filters_json stores all wizard inputs: calories, diet, cuisine, intolerances, excludes, mealsPerDay,
and all macros/micros (protein, carbs, fat, sat fat, fiber, sugar, cholesterol, sodium,
vitamins A/C/D/B6/B12, minerals calcium/iron/magnesium/potassium/zinc).

Cooking mode
Fullscreen step-by-step view. Swipe navigation.

Voice cooking
Reads steps aloud. Voice commands. Powered by expo-speech.

AI ingredient photo scanner
Camera or photo library. Up to 10 images per session. Review and remove detected ingredients.
3-tier search fallback so scanned ingredients always find results.

Premium tier infrastructure
DB-based subscription tracking. Paywall modal wired up.

AI Fridge Scan → Ingredient Check → Recipe Flow (Core Feature)
Full end-to-end flow: scan fridge → detected ingredients as chips → remove/add → match all/some →
results → "Cook it now?" → check ingredients one by one → AI suggests substitutes → Use it / Buy it →
session saved server-side. Quick Shopping List for missing ingredients.

Recipe search quality filter
Removes recipes with poor instructions: min 4 steps + at least 50% of ingredients mentioned in steps.
Auto-refills to minimum 12 quality results per page.

Auto logout when JWT expires ✅
Registration disclaimer checkbox ✅
14-day free trial on registration ✅
Enforce 10 searches/week for free users ✅
Rate-limit AI scanner to 3 scans/week for free users ✅
Lock meal plan history to premium ✅
Intolerances filter ✅
Meal type filter ✅
Exclude ingredients ✅
Welcome email on registration ✅
Trial ending warning email ✅
Account deletion confirmation email ✅
Registration UX — inline email verification ✅
Cognito verification email branding ✅
Trial days remaining on profile screen ✅
Trial countdown banner on Home screen ✅
Forgot password flow on mobile ✅
Advanced search filter panel ✅ (5 collapsible sections, macros/micros premium-gated)
AI Suggestions in search filter panel ✅ (preset chips + free text + voice, Claude Haiku)
Wine pairing breakfast guard ✅
AI ingredient substitute suggestion ✅
Quick Shopping List ✅
Active Recipe Session ✅
Claude failure owner alerts ✅ (lib/alertOwner.ts — email on 401/429/529, all 4 Claude routes wired)
Meal plan save weekStart bug fix ✅ (Sunday was computing next Monday — fixed)
Meal plan save confirmation alert ✅ (success/failure feedback to user)
Meal plan saved plans browser ✅
  Home screen has "Saved Plans" card alongside AI Goal and Customise.
  Tapping opens a folder browser — folders listed with plan count.
  Tapping a folder shows plans inside: name, calorie/meals/diet subtitle, date, modified badge.
  Tapping a plan loads it back into the active view with all filters and modified state restored.
My Recipes card image layout fix ✅ (image flush top-left, CDN images for tried-only recipes)
Build fix ✅ (@anthropic-ai/sdk added to package.json — was missing, broke Amplify builds)
