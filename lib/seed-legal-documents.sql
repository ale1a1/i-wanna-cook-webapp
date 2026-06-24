-- Seed file: legal document versions
-- Run once after schema migration. Safe to re-run (ON CONFLICT DO NOTHING).
-- To publish a new version: INSERT a new row with incremented version — never UPDATE existing rows.

INSERT INTO legal_documents (document_type, version, effective_date, content) VALUES

('disclaimer', 'v1', '2025-06-19',
'By creating an account, I confirm that I understand the following:

Nutritional information provided by this app is approximate and for general informational purposes only. It is not intended as, and does not constitute, professional dietary, medical, or nutritional advice.

Ingredient and allergen information may be incomplete or inaccurate. I will always check product labels and verify ingredients independently before preparing or consuming any recipe, particularly if I have food allergies, intolerances, or a medical condition.

This app is not suitable for managing medically prescribed diets. I will consult a qualified healthcare professional for any dietary needs related to a medical condition.')

ON CONFLICT (document_type, version) DO NOTHING;


INSERT INTO legal_documents (document_type, version, effective_date, content) VALUES

('privacy_policy', 'v1', '2025-06-19',
'I Wanna Cook — Privacy Policy
Last updated: 19 June 2025
Version: 1.0

Who we are
I Wanna Cook is operated by Alessandro Ladu, Flat 4, 2A Eversley Street, Liverpool, L8 2TG. Contact: alessandro.dev.ladu@gmail.com

What data we collect and why
- Email address: Account creation, transactional emails (welcome, password reset, account deletion)
- Username: Display name within the app
- Password: Stored securely via AWS Cognito — we never see your plain-text password
- Meal preferences, saved recipes, meal plans, shopping lists: Core app functionality
- Ingredient scan images: Processed in real time to identify ingredients — not stored after processing
- Subscription status and trial dates: To enforce free/premium access tiers
- Marketing consent timestamp: To record whether you opted in to marketing emails at registration

How data is stored
Your data is stored on AWS infrastructure located in the eu-west-2 (London) region:
- Account credentials: AWS Cognito
- Profile and app data: AWS RDS PostgreSQL

Who we share data with
We share data with the following third-party services only to the extent necessary to operate the app:
- Spoonacular (spoonacular.com) — recipe search queries and ingredient data are sent to Spoonacular''s API to return recipe results.
- Anthropic (anthropic.com) — ingredient scan images and certain queries are processed by Claude AI to identify ingredients and generate suggestions.
- Resend (resend.com) — used to send transactional emails. Your email address is passed to Resend for this purpose.
- AWS (Amazon Web Services) — infrastructure provider for hosting, authentication, and database.

We do not sell your data. We do not share your data with advertisers.

Marketing emails
If you opted in to marketing emails at registration, we may send you occasional emails about new features, tips, and promotions. You can unsubscribe at any time using the link in any marketing email or by emailing alessandro.dev.ladu@gmail.com.

Transactional emails (welcome, password reset, account deletion) are sent regardless of marketing consent as they are necessary to operate the service.

Your rights under GDPR
If you are based in the UK or EU, you have the right to:
- Access: request a copy of the personal data we hold about you
- Rectification: ask us to correct inaccurate data
- Erasure: request deletion of your account and associated data (available directly in the app via Profile > Delete Account)
- Portability: request your data in a machine-readable format
- Withdraw consent: unsubscribe from marketing emails at any time
- Lodge a complaint: with the UK Information Commissioner''s Office (ico.org.uk)

To exercise any right not available in-app, contact us at alessandro.dev.ladu@gmail.com. We will respond within 30 days.

Data retention
We retain your data for as long as your account is active. When you delete your account, your profile and all associated data are deleted from our systems within 30 days.

Children
This app is not intended for use by anyone under the age of 13. We do not knowingly collect data from children.

Changes to this policy
We will notify you of material changes by email or in-app notice. The version number and date at the top of this page will always reflect the current policy.

Contact
Alessandro Ladu, Flat 4, 2A Eversley Street, Liverpool, L8 2TG. Email: alessandro.dev.ladu@gmail.com')

ON CONFLICT (document_type, version) DO NOTHING;


INSERT INTO legal_documents (document_type, version, effective_date, content) VALUES

('terms_of_service', 'v1', '2025-06-19',
'I Wanna Cook — Terms of Service
Last updated: 19 June 2025
Version: 1.0

1. Who we are
I Wanna Cook is operated by Alessandro Ladu, Flat 4, 2A Eversley Street, Liverpool, L8 2TG. Email: alessandro.dev.ladu@gmail.com

2. What the app does
I Wanna Cook helps users discover recipes, plan meals, scan fridge ingredients, and build shopping lists. Recipe and nutritional data is sourced from Spoonacular. AI features are powered by Anthropic Claude.

3. Accounts
You must provide a valid email address and create a username to use the app. You are responsible for keeping your account credentials secure. You must be at least 13 years old to create an account.

4. Subscription and billing
- Free plan: 10 recipe searches per week, 3 ingredient scans per week.
- 14-day free trial: All new accounts receive full Premium access for 14 days at no charge. No payment card is required.
- Premium plan: $2.49/month or $19.99/year. Unlimited searches, unlimited scans, all premium features. Billed through Google Play (Android) or Apple App Store (iOS).
- Cancellation: You may cancel at any time through Google Play or the App Store. Access continues until the end of the billing period. No refunds for partial periods.
- Trial to free: When your trial expires without subscribing, your account automatically moves to the free plan. No data is deleted.

5. What we are not liable for
- Nutritional accuracy: Nutritional information is approximate and sourced from third parties. Do not rely on this app for medically prescribed dietary management.
- Allergic reactions: Ingredient and allergen information may be incomplete. We are not liable for any adverse reaction caused by reliance on recipe or ingredient information provided by the app. Always verify ingredients independently if you have food allergies or intolerances.
- Service availability: We do not guarantee uninterrupted access to the app and are not liable for losses resulting from downtime or service interruption.
- Third-party content: Recipe content is provided by Spoonacular. AI suggestions are generated by Anthropic Claude. We are not responsible for the accuracy or suitability of third-party content.

6. Acceptable use
You agree not to:
- Use the app for any unlawful purpose
- Attempt to reverse-engineer, scrape, or copy the app or its content
- Share your account with others
- Use automated tools to access the app

We reserve the right to suspend or terminate accounts that violate these terms.

7. Account termination
You may delete your account at any time via Profile > Delete Account. We may terminate your account if you breach these terms. On termination, your data is handled as described in our Privacy Policy.

8. Changes to these terms
We may update these terms from time to time. We will notify you of material changes by email or in-app notice. Continued use of the app after changes constitutes acceptance.

9. Governing law
These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.

10. Contact
Alessandro Ladu, Flat 4, 2A Eversley Street, Liverpool, L8 2TG. Email: alessandro.dev.ladu@gmail.com')

ON CONFLICT (document_type, version) DO NOTHING;
