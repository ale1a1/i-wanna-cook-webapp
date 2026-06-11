================================================================
WHAT SHOULD I COOK â€” ROADMAP
================================================================

All items refer to the mobile app (React Native / Expo) unless explicitly stated otherwise.
Backend API routes (/api/*) and the Next.js server are shared infrastructure â€” they are
not considered "web app features" and changes to them apply to both platforms.


================================================================
LIST: MUST â€” Before Launch
================================================================




--- âš ï¸ IMMEDIATE NEXT STEPS (test before moving on) ---


My Recipes: test and fix
  

Home screen update
The home screen still shows original early-development features.
Update it to reflect what the app actually does now: meal planner,
fridge scan, recipe tagging, cooking mode, quick shopping list, etc.
Pre-launch blocker â€” first impressions matter.

--- Navigation & UX ---

Navigation audit â€” back gestures and close buttons
Some screens use X button (blocks swipe-back gesture), others rely on swipe-left. Needs a full audit
before launch. Swipe-back should work on all stack screens; modals should have X. Recipe detail,
cooking mode, login modal, profile modals all need checking.

--- Emails ---

Fortnightly re-engagement email
Sent every 2 weeks to inactive users to bring them back. Requires SQS/Lambda or a cron job â€” not yet built.

--- Search ---

Ingredient autocomplete â€” search & meal planner
When typing in the Ingredients field (search) or the Exclude Ingredients field (meal planner), query
Spoonacular's autocomplete ingredient endpoint in real time and show suggestions below the input.
Reduces typos and ensures ingredient names match Spoonacular's DB exactly. Shared reusable component.
Spoonacular endpoint: GET /food/ingredients/autocomplete?query=&number=5.

Wine search â€” empty state + Claude fallback
When Spoonacular returns no wine pairing results, currently the screen is blank. Two fixes needed:
1. MUST â€” show a clear empty state message ("No wine pairings found for this recipe") instead of blank.
2. SHOULD â€” when Spoonacular returns empty, fall back to Claude (Haiku) to suggest 2â€“3 wines.
   Response: wine name + one-line reason + Google search link so user can find it.
   Reuse existing wine card layout where possible; otherwise plain labelled list with "AI suggested" tag.
   Only fires when Spoonacular returns empty â€” no double-calling.

--- Meal & Nutrition ---

Macro and nutrition tracking
Daily targets for calories, protein, carbs, fat. Track meals logged against targets.
Show trends over time. Premium.

--- Subscription & Payments ---

Wire up Google Play Billing
Android real subscription flow. Users can actually subscribe and pay via Google Play Billing.

Apple IAP (if doing iOS)
Apple In-App Purchase integration. Requires Apple Developer account ($99/year).

Auto-downgrade to free tier when trial expires
When trial ends, account drops to free tier automatically. No features deleted â€” locked behind upgrade prompt.
trial_active is computed at login time from trial_started_at â€” enforcement is already there, but the UI needs
to reflect it gracefully after expiry without requiring a re-login.

Trial expiry modal â€” 1-2 days warning
When trial is 1-2 days from expiring, show a one-time modal on app open prompting user to upgrade.
Fire once per account, not every session.

--- Legal & Safety ---

Professional disclaimer including allergy warning
A proper legal disclaimer must be shown during registration AND accessible from the app at all times.
Must cover: nutritional information is approximate and not a substitute for professional dietary advice,
allergy information may not be complete or accurate â€” always check product labels, not suitable for
medical dietary management. Requires a lawyer to draft or review.
NOTE: A user can currently register without seeing any allergy disclaimer â€” this is a legal risk before launch.

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

--- Review & Enhance ---

Endpoint enhancement audit
Cross-reference the full Spoonacular endpoint list against SHOULD / COULD / Phase 3 features.
Identify which planned features could be built with existing endpoints, and which unused endpoints
unlock cheap wins. Check autocomplete, nutrition facts, food trivia, recipe card images, etc.
Do this before starting any new feature work.


================================================================
LIST: SHOULD â€” High Priority After Launch
================================================================

Guided Navigation (contextual help system)
For non-obvious actions, show a one-time confirmation prompt with a "Don't ask again" option.
User can also tap a ? icon on any screen to trigger an animated walkthrough. Toggleable in Settings.

Dietary profile
Set dietary restrictions and intolerances once in profile â€” auto-applied to all searches and meal plans.
Premium. Foundation for sport/fitness presets.

AI chat assistant
Conversational screen: "Something quick with chicken", "high protein after gym", "use my leftovers".
Claude-powered. Premium.

Smart recommendations
Suggest recipes based on tried recipes and favourites history. Low API cost, high perceived value.

Pantry tracking
Manual ingredient inventory. Highlight items approaching expiry. Auto-suggest recipes. Big differentiator.

Full nutrition breakdown panel
Basic panel live. Full premium panel (fibre, sugar, RDA percentages) still to build.

Chef avatar narrator for cooking mode
Distinctive chef character during cooking mode. Reacts as steps progress.

Voice narrator for cooking mode
Chef reads each step aloud. Natural-sounding voice. TTS API (ElevenLabs or Google TTS). Premium.

Sentry error monitoring
Replace current custom Resend email error reporting with Sentry. Crashes, JS errors, full stack traces.

AI recipe instruction enrichment
For recipes with 50-70% ingredients in steps, Claude Haiku enriches instructions. Cost tracking required.

Analytics
Track searches, saves, completions, premium conversion, trial retention, meal plan usage.

Redis caching
Reduce Spoonacular API calls. Lower costs at scale.

CloudFront CDN
Faster image delivery globally.


================================================================
LIST: COULD â€” Later
================================================================

AI recipe modification
Make it healthier, increase protein, make it vegetarian, reduce calories. One tap. Premium only.

Push notifications
Dinner reminders, meal plan nudges, trial expiry alerts. Drives retention.

Cooking mode upgrades â€” individual item timers
Set a timer for pasta, another for sauce, independently.

Voice cooking assistant Phase 2
Always-on microphone across the whole app. Navigate and search by voice.

Language preference
User selects language, persisted to profile.

MFA
Multi-factor authentication via AWS Cognito.

Barcode scanner
Scan groceries to add to pantry instantly.


================================================================
LIST: FUTURE â€” Phase 3
================================================================

Supermarket shopping list integration
Send shopping list directly to an online supermarket (Tesco, Morrisons, Aldi, Lidl, Sainsbury's).
No public cart APIs exist today â€” requires partnership or aggregator. Phase 3 / partnership territory.

Fridge photo to full pantry state
Full "what can I cook with this?" flow. Needs Spoonacular Cook plan ($29/mo) at scale.

Recipe collections management
Recipe boards, folders, custom collections.


================================================================
LIST: TECHNICAL DEBT
================================================================

AWS SQS + Lambda email workers
Re-engagement email needs a scheduled job. Welcome/warning/deletion currently fire inline.

Push notification infrastructure
Required before push notifications can be built.


================================================================
SERVICE FAILURE & BILLING ALERTS â€” MANUAL CHECKLIST
================================================================

1. ANTHROPIC (Claude API)
Cost: pay-per-token. Runs out â†’ 401 or 429.
Used for: scanner, substitutes, AI filters, meal replacement validation.
Alert: âœ… Owner email on 401/429/529 (lib/alertOwner.ts)
Action: console.anthropic.com â†’ top up credits

2. SPOONACULAR
Cost: points-based daily quota. Free = 150pts/day. Paid from $29/mo.
Used for: all recipe search, detail, wine pairing, meal plan generation.
Alert: âš ï¸ PARTIAL â€” meal plan routes catch 402, search/detail/wine do NOT alert owner
Action: spoonacular.com/food-api/console â†’ check points â†’ upgrade or wait midnight UTC
TODO: Add 402 owner alert to /api/recipes/search, /api/recipes/[id], /api/recipes/wine-pairing

3. RESEND (email)
Cost: free = 3,000 emails/month. Paid from $20/mo.
Used for: welcome, trial warning, deletion, error alerts to owner.
Alert: âŒ NOT IMPLEMENTED â€” Resend failures silently swallowed
CRITICAL: if Resend fails, you stop receiving owner alerts AND user emails stop
Action: resend.com/overview â†’ check quota and logs â†’ upgrade if needed
TODO: Add console.error to all Resend .catch() blocks for CloudWatch visibility

4. AWS RDS PostgreSQL
Cost: always-on hourly charge. Stops if AWS bill unpaid.
Used for: ALL persistent data â€” users, plans, favourites, shopping list, etc.
Alert: âŒ NOT IMPLEMENTED â€” DB down = 500 errors to users, no owner email
Action: AWS Console â†’ RDS â†’ check instance status â†’ start if stopped
TODO: Enable AWS CloudWatch alarm on RDS instance (free, 15 min setup)

5. AWS COGNITO
Cost: free up to 50,000 MAUs.
Used for: all auth â€” register, login, verify, forgot password.
Alert: âŒ NOT IMPLEMENTED
Action: AWS Console â†’ Cognito â†’ check User Pool + Amplify env vars

6. AWS AMPLIFY (hosting)
Cost: pay-per-build + per-GB served.
Alert: âŒ NOT IMPLEMENTED â€” build failures only visible in console
TODO: Enable Amplify build notifications in console (1 click, free) â€” DO THIS NOW

SUMMARY â€” COVERAGE STATUS
--------------------------
Anthropic Claude  âœ… Owner email alert implemented
Spoonacular       âš ï¸ Partial (meal plan only, not search/detail)
Resend            âŒ Silent failure
AWS RDS           âŒ No alert (only generic 500 to user)
AWS Cognito       âŒ No alert
AWS Amplify       âŒ No build notifications

IMMEDIATE MANUAL ACTIONS (do these now, no code needed):
1. Enable Amplify build email notifications â†’ Amplify console â†’ Settings â†’ Notifications
2. Set up CloudWatch alarm on RDS instance â†’ alerts when DB stops or CPU spikes

CODE TODOS:
3. Add Spoonacular 402 owner alert to /api/recipes/search + /api/recipes/[id] + wine-pairing
4. Add console.error to all Resend .catch() so CloudWatch at least logs failures


================================================================
LIST: APIs & BREAKING POINTS
================================================================

Spoonacular â€” SPOONACULAR_API_KEY (server-side only)
- 402 â†’ quota exhausted â†’ spoonacular.com dashboard â†’ resets midnight UTC
- mealplanner/generate overshoots calories â†’ backend scales back to target

Claude â€” Model: claude-haiku-4-5-20251001 (always full model ID)
- 401/429/529 â†’ owner alerted via email âœ…

AWS Cognito â€” eu-west-2 â€” all auth
AWS RDS PostgreSQL â€” eu-west-2 â€” all data
AWS Amplify â€” auto-deploy on push to main
Resend â€” transactional emails (3000/month free)

Expo / React Native
- Public Wi-Fi â†’ npx expo start --tunnel
- Android build â†’ C:\p\ short path workaround


================================================================
PRICING
================================================================

Free â€” $0
10 searches/week, 3 scans/week, basic features. 14-day trial on signup.

Premium â€” $2.49/month or $19.99/year
Full access. Unlimited. All premium features.

Future pricing â€” $4.99/month
Once AI assistant and personalisation are live.

14-day free trial on every new account. No card required.


================================================================
LIST: ALREADY BUILT âœ…
================================================================

Recipe search with filters âœ…
Match all / Match some toggle âœ…
Recipe detail pages âœ…
My Recipes â€” To Try / Tried folder system âœ…
  Home screen: two large buttons (To Try, Tried) with counts.
  Each list: folder browser (Main List + named folders with counts).
  Save from RecipeDetail: "Add to Try List" / "Mark as Tried" â€” folder-picker modal on both.
  Active search filters stored per recipe; shown as filter chips inside folder view.
  Move/rename/delete folders. Mark-as-tried from To Try view. Rating and tag editing preserved.
  DB: folder + search_filters on favourites and tried_recipes tables.
Shopping list âœ…
User accounts â€” register, login, verify, forgot password, change password, delete âœ…
Light / dark theme âœ…
Cooking mode â€” fullscreen step-by-step, swipe navigation âœ…
Voice cooking â€” expo-speech âœ…
AI ingredient photo scanner âœ…
Premium tier infrastructure âœ…
AI Fridge Scan â†’ Ingredient Check â†’ Recipe Flow âœ…
Quick Shopping List âœ…
Active Recipe Session âœ…
AI ingredient substitute suggestion âœ…
Recipe search quality filter âœ…
Wine pairing breakfast guard âœ…
Auto logout when JWT expires âœ…
Registration disclaimer checkbox âœ…
14-day free trial on registration âœ…
Enforce 10 searches/week for free users âœ…
Rate-limit AI scanner to 3 scans/week for free users âœ…
Lock meal plan history to premium âœ…
Intolerances filter âœ…
Meal type filter âœ…
Exclude ingredients âœ…
Welcome email on registration âœ…
Trial ending warning email âœ…
Account deletion confirmation email âœ…
Registration UX â€” inline email verification âœ…
Cognito verification email branding âœ…
Trial days remaining on profile screen âœ…
Trial countdown banner on Home screen âœ…
Forgot password flow on mobile âœ…
Advanced search filter panel âœ… (5 sections, macros/micros premium-gated)
AI Suggestions in search filter panel âœ… (preset chips + free text + voice)

Weekly AI Meal Planner â€” full v2 âœ…
  Two-path generation: AI Goal and Customise (4-step wizard).
  Meals per day picker: 3/4/5/6. Calorie options up to 5000 kcal.
  AI path auto-suggests meals/day based on goal.
  Calories always at exact user target. Extra meals carved from daily budget.

Meal plan save & folder system âœ…
  Name + folder required. Save button hidden after saving.
  Folder picker in save modal (existing + new). Drag reorder folders and plans.
  Plan card ... menu: Move to folder, Copy to folder, Delete.
  Delete folder/plan with confirmation. Plan name shown at top of plan view.
  Timestamps formatted dd-mm-yy HH:MM.

Meal plan change tracking & save changes âœ…
  original_plan_data frozen in DB. Diff drives green checkmark icons on changed days/meals.
  Green "Plan modified" banner. Amber "Save changes" button when unsaved.
  Exit guard modal on navigation away with unsaved changes.
  Exit guard also fires for brand-new unsaved plans â€” "Save plan" or "Discard & leave".
  Both guard modals: dark backdrop, dismiss by tapping outside or swipe-back, no Cancel button.

Meal plan replace meal âœ…
  Uses original filters + per-meal calorie budget. All candidates green (within original criteria).
  Claude validation removed (was unreliable). Instant selection, no warning modal.

Scan the fridge â€” done screen âœ…
  Shows "You need to buy N ingredients" with Quick Shopping List link, or "You have everything!"

My Recipes â€” tags âœ…
  Tag picker on save (pageSheet). Suggested + custom tags. Grey chip display on cards.
  Tag filter dropdown. Edit tags via pricetag icon.

My Recipes card image layout fix âœ…
Claude failure owner alerts âœ… (email on 401/429/529 â€” lib/alertOwner.ts)
Build fix âœ… (@anthropic-ai/sdk missing from package.json)
Recipe collections superseded by My Recipes tags âœ…
Meal Plans nav + header rename âœ… (tab, top bar, home view all say "Meal Plans"; home shows two buttons directly)
Meal planner â€” QA tested âœ… (all flows verified: generate, save, browse, replace, change tracking, exit guards)

