export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-1">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: 19 June 2025 &mdash; Version 1.0</p>

      <section className="space-y-6 text-sm leading-relaxed text-foreground">

        <div>
          <h2 className="font-semibold text-base mb-2">Who we are</h2>
          <p>I Wanna Cook is operated by Alessandro Ladu, Flat 4, 2A Eversley Street, Liverpool, L8 2TG. Contact: <a href="mailto:alessandro.dev.ladu@gmail.com" className="underline">alessandro.dev.ladu@gmail.com</a></p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">What data we collect and why</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Data</th>
                <th className="text-left py-2 font-medium">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr><td className="py-2 pr-4 align-top">Email address</td><td className="py-2 align-top">Account creation, transactional emails (welcome, password reset, account deletion)</td></tr>
              <tr><td className="py-2 pr-4 align-top">Username</td><td className="py-2 align-top">Display name within the app</td></tr>
              <tr><td className="py-2 pr-4 align-top">Password</td><td className="py-2 align-top">Stored securely via AWS Cognito — we never see your plain-text password</td></tr>
              <tr><td className="py-2 pr-4 align-top">Meal preferences, saved recipes, meal plans, shopping lists</td><td className="py-2 align-top">Core app functionality</td></tr>
              <tr><td className="py-2 pr-4 align-top">Ingredient scan images</td><td className="py-2 align-top">Processed in real time to identify ingredients — not stored after processing</td></tr>
              <tr><td className="py-2 pr-4 align-top">Subscription status and trial dates</td><td className="py-2 align-top">To enforce free/premium access tiers</td></tr>
              <tr><td className="py-2 pr-4 align-top">Marketing consent timestamp</td><td className="py-2 align-top">To record whether you opted in to marketing emails at registration</td></tr>
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">How data is stored</h2>
          <p>Your data is stored on AWS infrastructure located in the <strong>eu-west-2 (London)</strong> region:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Account credentials: AWS Cognito</li>
            <li>Profile and app data: AWS RDS PostgreSQL</li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">Who we share data with</h2>
          <p className="mb-2">We share data with the following third-party services only to the extent necessary to operate the app:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Spoonacular</strong> (spoonacular.com) — recipe search queries and ingredient data are sent to Spoonacular&apos;s API to return recipe results.</li>
            <li><strong>Anthropic</strong> (anthropic.com) — ingredient scan images and certain queries are processed by Claude AI to identify ingredients and generate suggestions.</li>
            <li><strong>Resend</strong> (resend.com) — used to send transactional emails. Your email address is passed to Resend for this purpose.</li>
            <li><strong>AWS</strong> (Amazon Web Services) — infrastructure provider for hosting, authentication, and database.</li>
          </ul>
          <p className="mt-2">We do not sell your data. We do not share your data with advertisers.</p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">Marketing emails</h2>
          <p>If you opted in to marketing emails at registration, we may send you occasional emails about new features, tips, and promotions. You can unsubscribe at any time using the link in any marketing email or by emailing <a href="mailto:alessandro.dev.ladu@gmail.com" className="underline">alessandro.dev.ladu@gmail.com</a>.</p>
          <p className="mt-2">Transactional emails (welcome, password reset, account deletion) are sent regardless of marketing consent as they are necessary to operate the service.</p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">Your rights under GDPR</h2>
          <p className="mb-2">If you are based in the UK or EU, you have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
            <li><strong>Rectification</strong> — ask us to correct inaccurate data</li>
            <li><strong>Erasure</strong> — request deletion of your account and data (available in the app via Profile &rarr; Delete Account)</li>
            <li><strong>Portability</strong> — request your data in a machine-readable format</li>
            <li><strong>Withdraw consent</strong> — unsubscribe from marketing emails at any time</li>
            <li><strong>Lodge a complaint</strong> — with the UK Information Commissioner&apos;s Office (<a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="underline">ico.org.uk</a>)</li>
          </ul>
          <p className="mt-2">To exercise any right not available in-app, contact us at <a href="mailto:alessandro.dev.ladu@gmail.com" className="underline">alessandro.dev.ladu@gmail.com</a>. We will respond within 30 days.</p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">Data retention</h2>
          <p>We retain your data for as long as your account is active. When you delete your account, your profile and all associated data are deleted from our systems within 30 days.</p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">Children</h2>
          <p>This app is not intended for use by anyone under the age of 13. We do not knowingly collect data from children.</p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">Changes to this policy</h2>
          <p>We will notify you of material changes by email or in-app notice. The version number and date at the top of this page will always reflect the current policy.</p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">Contact</h2>
          <p>Alessandro Ladu, Flat 4, 2A Eversley Street, Liverpool, L8 2TG.<br />Email: <a href="mailto:alessandro.dev.ladu@gmail.com" className="underline">alessandro.dev.ladu@gmail.com</a></p>
        </div>

      </section>
    </div>
  )
}
