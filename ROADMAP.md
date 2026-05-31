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
LIST: APIs & BREAKING POINTS
================================================================

Spoonacular
Used for: recipe search, recipe detail, wine pairing, ingredient substitutes (legacy), meal plan generation.
API key: SPOONACULAR_API_KEY in .env.local (server-side only, never client).
Proxied via: /api/recipes/* and /api/meal-plan/* routes on the Next.js backend.
Quota: points-based. complexSearch = 1pt + 0.01pt per result + extras if addRecipeInformation/Nutrition set.
Breaking points:
- 402 or "apiKey" error in response → quota exhausted for the day. Check spoonacular.com dashboard.
- Recipe detail returns empty extendedIngredients → Spoonacular data gap, not a code bug.
- Search returns 0 results with no error → too many filters combined, or ingredient names too specific.
- CORS error → route is being called client-side directly. Must always go through /api/* proxy.
- mealplanner/generate overshoots calories by ~20% — backend scales nutrients back to target after fetch.

Claude (Anthropic)
Used for: ingredient photo scanning (vision), substitute suggestions, AI filter suggestions, meal replacement validation.
API key: ANTHROPIC_API_KEY in .env.local (server-side only). Must also be set in Amplify env vars.
Model: claude-haiku-4-5-20251001 for all current calls. Use full model ID — short names will 404.
Proxied via: /api/recipes/analyze-image, /api/recipes/suggest-substitute, /api/recipes/suggest-filters,
             /api/meal-plan/replace-meal.
Breaking points:
- 401 → API key missing or wrong. Check .env.local and Amplify environment variables.
- 529 or 503 → Anthropic overloaded. Retry after a few seconds.
- Response not valid JSON → Claude returned markdown instead of plain text. Check prompt.

AWS Cognito
Used for: user authentication (register, login, email verify, forgot password, change password).
Region: eu-west-2.
Breaking points:
- "UserNotConfirmedException" → user registered but didn't verify email.
- "NotAuthorizedException" → wrong password or user doesn't exist.
- JWT expired → auto-logout handled. Auth state cleared on expiry.
- Resend code fails → AutoVerifiedAttributes must include 'email' on the user pool.

AWS RDS PostgreSQL
Used for: all persistent data — users, favourites, shopping list, tried recipes, meal plans, ratings,
quick shopping list, active recipe session, search_usage, scan_usage.
Region: eu-west-2.
Breaking points:
- "Connection refused" or pool timeout → RDS instance stopped or security group blocking Amplify IP.
- "column does not exist" → migration not run. Check lib/schema.sql and run missing ALTER TABLE manually.
- "unique constraint violated" → duplicate insert. Check ON CONFLICT clause.

AWS Amplify (hosting)
Used for: auto-deploy Next.js backend + web frontend on push to main.
Breaking points:
- Build fails → check Amplify console build logs. Usually a missing env var or TypeScript error.
- Environment variable not found at runtime → must be added in Amplify console, not just .env.local.
- Old code still running after push → trigger a manual redeploy from the console.

Resend (email)
Used for: welcome email, trial warning email, deletion confirmation email.
API key: RESEND_API_KEY in .env.local and Amplify env vars.
Breaking points:
- Emails not arriving → check Resend dashboard. Free plan only reliably delivers to account owner's email.
- To send to any email → need a verified custom domain in Resend.

Expo / React Native (mobile)
Breaking points:
- Metro bundler crash → delete node_modules/.cache and restart.
- Public Wi-Fi blocks LAN → use npx expo start --tunnel.
- Android build fails → check C:\p\ short path workaround (Windows 260-char path limit).
- expo-speech not working on device → physical device permissions or TTS engine not installed.
- Navigation crash on tab swap → session state changed mid-render. Check HomeTabs in App.tsx.


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
