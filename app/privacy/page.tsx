{/* Boilerplate drafted for Google OAuth verification; not lawyer-reviewed. Have counsel review before scaling. */}
export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#EEF6FC] px-4 py-12">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <a href="/">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="text-3xl">&#127869;&#65039;</span>
              <span className="text-2xl font-bold text-gray-900">Let&apos;s Get Lunch</span>
            </div>
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mt-1">Last updated: May 31, 2026</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm text-gray-700 text-base leading-relaxed space-y-5">
          <p>Let&apos;s Get Lunch (&quot;we,&quot; &quot;us&quot;) operates letsgetlunch.nyc, a directory of New York City prix-fixe lunch deals where you can browse listings and make reservation requests. This policy explains what we collect and how we use it.</p>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">What we collect</h2>
            <p>When you create an account, we collect your name, email address, and optionally the neighborhood where you typically eat lunch. If you sign in with Google, we receive your name, email address, and profile picture from Google. When you make a reservation request, we collect the details of that request, such as the restaurant, date, and party size.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">How we use it</h2>
            <p>We use your information to provide the service, send you reservation confirmations and related emails, personalize listings to your area, and improve the product. We do not sell your personal data.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Service providers</h2>
            <p>We rely on a small number of trusted providers to operate the service, and share data with them only for that purpose: Supabase (authentication and database), Resend (transactional email), Vercel (hosting), and Google (optional sign-in).</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h2>
            <p>We use Vercel Web Analytics, a privacy-friendly analytics service provided by our hosting partner, to understand how many people visit the site and which pages they view. This service does not use cookies, does not identify individual users, and does not track you across other websites. It collects aggregated data such as page views, referring sites, country, and device type.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Your choices</h2>
            <p>You can request access to, correction of, or deletion of your personal data at any time by emailing us, and we will respond within a reasonable time.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact</h2>
            <p>Questions? Email <a href="mailto:brian@letsgetlunch.nyc" className="text-[#4A9FD5] hover:underline">brian@letsgetlunch.nyc</a>.</p>
          </div>
        </div>
        <p className="text-center mt-6"><a href="/" className="text-sm text-[#4A9FD5] hover:underline">&larr; Back to lunch deals</a></p>
      </div>
    </main>
  );
}
